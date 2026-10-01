import { describe, expect, it, vi } from 'vitest'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { Client } from '../../../src/client.js'
import { AuthError, NetworkError, RateLimitError } from '../../../src/lib-internal/errors/index.js'

type AdapterResponse = {
    data: unknown
    status: number
    statusText: string
    headers: Record<string, string>
    config: InternalAxiosRequestConfig
}

function adapterFor(
    handler: (config: InternalAxiosRequestConfig) => AdapterResponse | Promise<AdapterResponse>
) {
    return handler
}

function axiosInstance(client: Client) {
    return (client.httpClient as unknown as {
        axiosInstance: {
            defaults: { adapter: unknown }
        }
    }).axiosInstance
}

function rejectedResponse(
    config: InternalAxiosRequestConfig,
    status: number,
    data: unknown,
    headers: Record<string, string> = {}
) {
    const response = { data, status, statusText: 'error', headers, config }
    return Promise.reject(new AxiosError('request failed', 'ERR_BAD_RESPONSE', config, undefined, response as never))
}

describe('HttpClient transport boundary', () => {
    it('returns response data and normalizes endpoint paths', async () => {
        const client = new Client({ apiUrl: 'https://api.example.com', appSlug: 'app', token: 'session' })
        const calls: string[] = []
        axiosInstance(client).defaults.adapter = adapterFor(async (config) => {
            calls.push(`${config.method}:${config.url}`)
            return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config }
        })

        await expect(client.httpClient.get('api/apps/app/settings/')).resolves.toEqual({ ok: true })
        expect(calls).toEqual(['get:/api/apps/app/settings/'])
    })

    it.each([401, 410, 419])('clears the session token for %i responses', async (status) => {
        const client = new Client({ apiUrl: 'https://api.example.com', appSlug: 'app', token: 'session' })
        const tokenClient = client.tokenClient
        const clearTokens = vi.spyOn(tokenClient, 'clearTokens')
        axiosInstance(client).defaults.adapter = adapterFor((config) => rejectedResponse(
            config,
            status,
            { code: 'UNAUTHORIZED', message: 'expired' },
        ) as never)

        await expect(client.httpClient.get('api/protected/')).rejects.toBeInstanceOf(AuthError)
        expect(clearTokens).toHaveBeenCalledOnce()
    })

    it('keeps the session for a permission failure and maps retry-after', async () => {
        const client = new Client({ apiUrl: 'https://api.example.com', appSlug: 'app', token: 'session' })
        const clearTokens = vi.spyOn(client.tokenClient, 'clearTokens')
        axiosInstance(client).defaults.adapter = adapterFor((config) => rejectedResponse(
            config,
            429,
            { code: 'RATE_LIMITED', message: 'slow down' },
            { 'retry-after': '30' },
        ) as never)

        await expect(client.httpClient.get('api/protected/')).rejects.toMatchObject({
            constructor: RateLimitError,
            retryAfter: 30,
        })
        expect(clearTokens).not.toHaveBeenCalled()
    })

    it('maps an Axios transport failure to NetworkError', async () => {
        const client = new Client({ apiUrl: 'https://api.example.com', appSlug: 'app' })
        axiosInstance(client).defaults.adapter = async () => {
            throw new AxiosError('socket closed', 'ERR_NETWORK')
        }

        await expect(client.httpClient.get('api/health/')).rejects.toBeInstanceOf(NetworkError)
    })

    it('does not add JSON content type to FormData requests', async () => {
        const client = new Client({ apiUrl: 'https://api.example.com', appSlug: 'app', token: 'session' })
        let contentType: unknown
        axiosInstance(client).defaults.adapter = adapterFor(async (config) => {
            contentType = config.headers['Content-Type']
            return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
        })

        await client.httpClient.post('api/upload/', new FormData())
        // Axios chooses its multipart/urlencoded content type later; the SDK
        // must not overwrite it with application/json before that happens.
        expect(contentType).not.toBe('application/json')
    })
})

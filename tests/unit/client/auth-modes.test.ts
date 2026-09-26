import { afterEach, describe, expect, it, vi } from 'vitest'
import type { InternalAxiosRequestConfig } from 'axios'
import { Client } from '../../../src/client.js'
import { Auth } from '../../../src/lib/auth/AuthClient.js'
import { BillingError, RateLimitError, createErrorFromResponse } from '../../../src/lib-internal/errors/index.js'

vi.spyOn(console, 'info').mockImplementation(() => undefined)

/** Sends one request through the real interceptors and returns its headers. */
async function sentHeaders(client: Client): Promise<Record<string, unknown>> {
    let headers: Record<string, unknown> = {}
    const axiosInstance = (client.httpClient as unknown as { axiosInstance: { defaults: { adapter: unknown } } }).axiosInstance
    axiosInstance.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
        headers = { ...config.headers }
        return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
    }
    await client.httpClient.get('api/apps/app/roles/')
    return headers
}

describe('auth modes', () => {
    it('session mode sends the session and ignores a leftover apiKey', async () => {
        const client = new Client({ apiUrl: 'https://api.test', appSlug: 'app', apiKey: 'session-authenticated-client', token: 'sess' })
        const headers = await sentHeaders(client)
        expect(headers['X-Session-Token']).toBe('sess')
        expect(headers['Authorization']).toBeUndefined()
    })

    it('apiKey mode sends only the API key', async () => {
        const client = new Client({ apiUrl: 'https://api.test', appSlug: 'app', authMode: 'apiKey', apiKey: 'k1', token: 'sess' })
        const headers = await sentHeaders(client)
        expect(headers['Authorization']).toBe('Api-Key k1')
        expect(headers['X-Session-Token']).toBeUndefined()
    })

    it('apiKey mode requires a key', () => {
        expect(() => new Client({ apiUrl: 'https://api.test', appSlug: 'app', authMode: 'apiKey' }))
            .toThrow('authMode "apiKey" requires apiKey')
    })
})

describe('apiKey mode in a browser', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        vi.resetModules()
    })

    it('refuses to run', async () => {
        vi.stubGlobal('window', { location: { hash: '', href: 'https://app.test/' } })
        vi.stubGlobal('document', {})
        vi.resetModules()
        const { Client: BrowserClient } = await import('../../../src/client.js')
        expect(() => new BrowserClient({ apiUrl: 'https://api.test', appSlug: 'app', authMode: 'apiKey', apiKey: 'k1' }))
            .toThrow(/server code only/)
    })
})

describe('sign-in redirect', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    function stubBrowser(hash: string) {
        const replaceState = vi.fn()
        const storage = new Map<string, string>()
        vi.stubGlobal('localStorage', {
            getItem: (k: string) => storage.get(k) ?? null,
            setItem: (k: string, v: string) => void storage.set(k, v),
            removeItem: (k: string) => void storage.delete(k),
        })
        vi.stubGlobal('window', {
            location: { href: `https://app.test/tasks?x=1${hash}`, hash, pathname: '/tasks', search: '?x=1' },
            history: { state: { router: 'state' }, replaceState },
        })
        return { replaceState }
    }

    it('handleRedirect captures the token and strips only the sign-in values', () => {
        const { replaceState } = stubBrowser('#session_token=abc&access_token=jwt&refresh_token=r&tab=2')
        const tokenClient = { setTokens: vi.fn(), setAccessToken: vi.fn(), clearTokens: vi.fn() }
        const auth = new Auth({ tokenClient, getConfig: () => ({}) } as unknown as Client)

        expect(auth.handleRedirect()).toBe('abc')
        expect(tokenClient.setTokens).toHaveBeenCalledWith({ sessionToken: 'abc' })
        expect(replaceState).toHaveBeenCalledWith({ router: 'state' }, '', '/tasks?x=1#tab=2')
    })

    it('returns null when the address has no session token', () => {
        stubBrowser('#tab=2')
        const tokenClient = { setTokens: vi.fn() }
        const auth = new Auth({ tokenClient, getConfig: () => ({}) } as unknown as Client)
        expect(auth.handleRedirect()).toBeNull()
        expect(tokenClient.setTokens).not.toHaveBeenCalled()
    })

    it('setSession and clearSession manage the stored token', () => {
        const tokenClient = { setAccessToken: vi.fn(), clearTokens: vi.fn() }
        const auth = new Auth({ tokenClient, getConfig: () => ({}) } as unknown as Client)
        auth.setSession('from-cookie')
        auth.clearSession()
        expect(tokenClient.setAccessToken).toHaveBeenCalledWith('from-cookie')
        expect(tokenClient.clearTokens).toHaveBeenCalled()
    })
})

describe('billing refusals', () => {
    it.each([
        [402, 'account_suspended', false],
        [429, 'product_suspended', false],
        [503, 'gate_unavailable', true],
    ])('%i %s becomes BillingError', (status, code, retryable) => {
        const err = createErrorFromResponse(status, { code, detail: 'Blocked by billing', module: 'database' })
        expect(err).toBeInstanceOf(BillingError)
        expect(err).not.toBeInstanceOf(RateLimitError)
        expect(err.message).toBe('Blocked by billing')
        expect((err as BillingError).module).toBe('database')
        expect((err as BillingError).retryable).toBe(retryable)
        expect(err.statusCode).toBe(status)
    })

    it('a plain 429 is still a RateLimitError', () => {
        expect(createErrorFromResponse(429, { code: 'RATE_LIMITED', message: 'Slow down' })).toBeInstanceOf(RateLimitError)
    })
})

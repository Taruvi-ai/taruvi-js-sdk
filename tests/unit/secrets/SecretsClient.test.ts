import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Secrets } from '../../../src/lib/secrets/SecretsClient.js'
import { Client } from '../../../src/client.js'
import type { SecretResponse, SecretsListResponse } from '../../../src/lib/secrets/types.js'

const mockHttpClient = {
    get: vi.fn(),
    put: vi.fn()
}

const mockClient = {
    getConfig: () => ({ apiKey: 'test-key', appSlug: 'test-app', apiUrl: 'https://api.test.com' }),
    httpClient: mockHttpClient
} as unknown as Client

describe('Secrets', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('get()', () => {
        it('gets secret by key', async () => {
            const secretData = { key: 'MY_SECRET', value: 'secret-value' }
            mockHttpClient.get.mockResolvedValue(secretData)

            const secrets = new Secrets(mockClient)
            const result = await secrets.get('MY_SECRET').execute()

            expect(mockHttpClient.get).toHaveBeenCalledWith('api/secrets/MY_SECRET/')
            expect(result).toEqual(secretData)
        })

        it('throws error when key is empty', () => {
            const secrets = new Secrets(mockClient)
            expect(() => secrets.get('')).toThrow('Secret key is required')
        })

        it('throws error when key is not a string', () => {
            const secrets = new Secrets(mockClient)
            expect(() => secrets.get(123 as any)).toThrow('Secret key is required')
        })

        it('includes app context in query params', async () => {
            mockHttpClient.get.mockResolvedValue({})

            const secrets = new Secrets(mockClient)
            await secrets.get('MY_SECRET', { app: 'my-app' }).execute()

            expect(mockHttpClient.get).toHaveBeenCalledWith(
                expect.stringContaining('app=my-app')
            )
        })

        it('includes tags in query params', async () => {
            mockHttpClient.get.mockResolvedValue({})

            const secrets = new Secrets(mockClient)
            await secrets.get('MY_SECRET', { tags: ['prod', 'api'] }).execute()

            expect(mockHttpClient.get).toHaveBeenCalledWith(
                expect.stringContaining('tags=prod%2Capi')
            )
        })
    })

    describe('list()', () => {
        it('lists secrets by keys', async () => {
            const response = { MY_KEY: 'value1', OTHER_KEY: 'value2' }
            mockHttpClient.get.mockResolvedValue(response)

            const secrets = new Secrets(mockClient)
            const result = await secrets.list(['MY_KEY', 'OTHER_KEY'])

            expect(mockHttpClient.get).toHaveBeenCalledWith(
                expect.stringContaining('keys=MY_KEY%2COTHER_KEY')
            )
            expect(result).toEqual(response)
        })

        it('includes app context', async () => {
            mockHttpClient.get.mockResolvedValue({})

            const secrets = new Secrets(mockClient)
            await secrets.list(['KEY1'], { app: 'my-app' })

            expect(mockHttpClient.get).toHaveBeenCalledWith(
                expect.stringContaining('app=my-app')
            )
        })

        it('includes metadata flag', async () => {
            mockHttpClient.get.mockResolvedValue({})

            const secrets = new Secrets(mockClient)
            await secrets.list(['KEY1'], { includeMetadata: true })

            expect(mockHttpClient.get).toHaveBeenCalledWith(
                expect.stringContaining('include_metadata=true')
            )
        })
    })

    describe('execute()', () => {
        it('executes GET request by default', async () => {
            mockHttpClient.get.mockResolvedValue({ key: 'value' })

            const secrets = new Secrets(mockClient)
            await secrets.execute()

            expect(mockHttpClient.get).toHaveBeenCalled()
        })
    })

    describe('response handling', () => {
        it('returns single secret matching SecretResponse type', async () => {
            const mockResponse: SecretResponse = {
                status: 'success',
                message: 'Secret retrieved successfully',
                data: { key: 'MY_SECRET', value: 'secret-value', tags: ['prod'], secret_type: 'string' }
            }
            mockHttpClient.get.mockResolvedValue(mockResponse)
            const result = await new Secrets(mockClient).get('MY_SECRET').execute() as SecretResponse
            expect(result.status).toBe('success')
            expect(result.data.key).toBe('MY_SECRET')
            expect(result.data.value).toBe('secret-value')
            expect(result.data.tags).toContain('prod')
        })

        it('returns secrets list matching SecretsListResponse type', async () => {
            const mockResponse: SecretsListResponse = {
                status: 'success',
                message: 'Retrieved 2 secret(s)',
                data: [
                    { key: 'KEY1', value: 'val1' },
                    { key: 'KEY2', value: 'val2' }
                ],
                total: 2
            }
            mockHttpClient.get.mockResolvedValue(mockResponse)
            const result = await new Secrets(mockClient).list(['KEY1', 'KEY2']) as SecretsListResponse
            expect(result.data).toHaveLength(2)
            expect(result.data[0].key).toBe('KEY1')
            expect(result.total).toBe(2)
        })
    })
})

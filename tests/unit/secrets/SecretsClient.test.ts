import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Secrets } from '../../../src/lib/secrets/SecretsClient.js'
import { Client } from '../../../src/client.js'

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
})

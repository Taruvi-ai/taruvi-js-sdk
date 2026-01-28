import { describe, it, expect, vi, beforeEach } from 'vitest'
import { App } from '../../../src/lib/app/AppClient.js'
import { Client } from '../../../src/client.js'

const mockHttpClient = {
    get: vi.fn()
}

const mockClient = {
    getConfig: () => ({ apiKey: 'test-key', appSlug: 'test-app', apiUrl: 'https://api.test.com' }),
    httpClient: mockHttpClient
} as unknown as Client

describe('App', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('roles()', () => {
        it('returns App instance for chaining', () => {
            const app = new App(mockClient)
            const result = app.roles()
            expect(result).toBeInstanceOf(App)
        })

        it('fetches app roles on execute', async () => {
            const rolesData = [
                { id: '1', name: 'Admin', permissions: ['read', 'write', 'delete'] },
                { id: '2', name: 'Editor', permissions: ['read', 'write'] }
            ]
            mockHttpClient.get.mockResolvedValue(rolesData)

            const app = new App(mockClient)
            const result = await app.roles().execute()

            expect(mockHttpClient.get).toHaveBeenCalledWith('api/apps/test-app/roles')
            expect(result).toEqual(rolesData)
        })
    })

    describe('settings()', () => {
        it('returns App instance for chaining', () => {
            const app = new App(mockClient)
            const result = app.settings()
            expect(result).toBeInstanceOf(App)
        })

        it('fetches app settings on execute', async () => {
            const settingsData = { theme: 'dark', language: 'en' }
            mockHttpClient.get.mockResolvedValue(settingsData)

            const app = new App(mockClient)
            const result = await app.settings().execute()

            expect(mockHttpClient.get).toHaveBeenCalledWith('api/apps/test-app/settings/')
            expect(result).toEqual(settingsData)
        })
    })

    describe('execute()', () => {
        it('calls httpClient.get by default', async () => {
            mockHttpClient.get.mockResolvedValue({})

            const app = new App(mockClient)
            await app.execute()

            expect(mockHttpClient.get).toHaveBeenCalled()
        })

        it('builds correct base URL with app slug', async () => {
            mockHttpClient.get.mockResolvedValue({})

            const app = new App(mockClient)
            await app.roles().execute()

            expect(mockHttpClient.get).toHaveBeenCalledWith(
                expect.stringContaining('api/apps/test-app')
            )
        })
    })
})

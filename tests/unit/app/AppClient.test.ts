import { describe, it, expect, vi, beforeEach } from 'vitest'
import { App } from '../../../src/lib/app/AppClient.js'
import { Client } from '../../../src/client.js'
import type { RolesListResponse, AppSettingsResponse } from '../../../src/lib/app/types.js'

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

    describe('response handling', () => {
        it('returns roles list matching RolesListResponse type', async () => {
            const mockResponse: RolesListResponse = {
                status: 'success',
                message: 'Data retrieved successfully',
                data: [
                    { id: '1', name: 'Admin', slug: 'admin', description: 'Admin role', is_default: false, created_at: '2024-01-01', updated_at: '2024-01-01' },
                    { id: '2', name: 'Editor', slug: 'editor', description: 'Editor role', is_default: false, created_at: '2024-01-01', updated_at: '2024-01-01' }
                ],
                total: 2
            }
            mockHttpClient.get.mockResolvedValue(mockResponse)
            const result = await new App(mockClient).roles().execute() as RolesListResponse
            expect(result.status).toBe('success')
            expect(result.data).toHaveLength(2)
            expect(result.data[0].name).toBe('Admin')
            expect(result.total).toBe(2)
        })

        it('returns settings matching AppSettingsResponse type', async () => {
            const mockResponse: AppSettingsResponse = {
                status: 'success',
                message: 'Settings retrieved successfully',
                data: { name: 'My App', slug: 'my-app', description: 'Test app', is_active: true, documentation_url: null, support_email: null, default_frontend_worker_url: null, created_at: '2024-01-01', updated_at: '2024-01-01' }
            }
            mockHttpClient.get.mockResolvedValue(mockResponse)
            const result = await new App(mockClient).settings().execute() as AppSettingsResponse
            expect(result.data.name).toBe('My App')
            expect(result.data.is_active).toBe(true)
        })
    })
})

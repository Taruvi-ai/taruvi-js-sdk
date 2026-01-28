import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Settings } from '../../../src/lib/settings/SettingsClient.js'
import { Client } from '../../../src/client.js'

const mockHttpClient = {
    get: vi.fn()
}

const mockClient = {
    getConfig: () => ({ apiKey: 'test-key', appSlug: 'test-app', apiUrl: 'https://api.test.com' }),
    httpClient: mockHttpClient
} as unknown as Client

describe('Settings', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('get()', () => {
        it('fetches site settings', async () => {
            const settingsData = {
                site_name: 'My Site',
                frontend_url: 'https://mysite.com',
                features: { analytics: true }
            }
            mockHttpClient.get.mockResolvedValue(settingsData)

            const settings = new Settings(mockClient)
            const result = await settings.get()

            expect(mockHttpClient.get).toHaveBeenCalledWith('api/settings/metadata/')
            expect(result).toEqual(settingsData)
        })

        it('supports typed response', async () => {
            interface SiteSettings {
                site_name: string
                frontend_url: string
            }
            const settingsData = { site_name: 'Test', frontend_url: 'https://test.com' }
            mockHttpClient.get.mockResolvedValue(settingsData)

            const settings = new Settings(mockClient)
            const result = await settings.get<SiteSettings>()

            expect(result.site_name).toBe('Test')
            expect(result.frontend_url).toBe('https://test.com')
        })
    })
})

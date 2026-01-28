import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Client } from '../../../src/client.js'

describe('Client', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('constructor', () => {
        it('throws error when config is not provided', () => {
            expect(() => new Client(undefined as any)).toThrow('Config is required')
        })

        it('throws error when apiKey is missing', () => {
            expect(() => new Client({ apiUrl: 'https://api.test.com', appSlug: 'test' } as any))
                .toThrow('API key is required')
        })

        it('throws error when apiUrl is missing', () => {
            expect(() => new Client({ apiKey: 'key', appSlug: 'test' } as any))
                .toThrow('API URL is required')
        })

        it('creates client with valid config', () => {
            const client = new Client({
                apiKey: 'test-key',
                appSlug: 'test-app',
                apiUrl: 'https://api.test.com'
            })
            expect(client).toBeInstanceOf(Client)
        })

        it('initializes httpClient and tokenClient', () => {
            const client = new Client({
                apiKey: 'test-key',
                appSlug: 'test-app',
                apiUrl: 'https://api.test.com'
            })
            expect(client.httpClient).toBeDefined()
            expect(client.tokenClient).toBeDefined()
        })
    })

    describe('getConfig()', () => {
        it('returns readonly copy of config', () => {
            const config = {
                apiKey: 'test-key',
                appSlug: 'test-app',
                apiUrl: 'https://api.test.com'
            }
            const client = new Client(config)
            const returnedConfig = client.getConfig()

            expect(returnedConfig.apiKey).toBe(config.apiKey)
            expect(returnedConfig.appSlug).toBe(config.appSlug)
            expect(returnedConfig.apiUrl).toBe(config.apiUrl)
        })

        it('includes optional deskUrl when provided', () => {
            const config = {
                apiKey: 'test-key',
                appSlug: 'test-app',
                apiUrl: 'https://api.test.com',
                deskUrl: 'https://desk.test.com'
            }
            const client = new Client(config)
            expect(client.getConfig().deskUrl).toBe('https://desk.test.com')
        })
    })
})

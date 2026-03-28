import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Auth } from '../../../src/lib/auth/AuthClient.js'
import { Client } from '../../../src/client.js'

const mockTokenClient = {
    isAuthenticated: vi.fn(),
    getToken: vi.fn(),
    getSessionToken: vi.fn(),
    clearTokens: vi.fn(),
}

const mockHttpClient = {
    get: vi.fn(),
    post: vi.fn()
}

const mockClient = {
    getConfig: () => ({
        apiKey: 'test-key',
        appSlug: 'test-app',
        apiUrl: 'https://api.test.com',
        deskUrl: 'https://desk.test.com'
    }),
    httpClient: mockHttpClient,
    tokenClient: mockTokenClient
} as unknown as Client

describe('Auth', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('isUserAuthenticated()', () => {
        it('returns true when user is authenticated', () => {
            mockTokenClient.isAuthenticated.mockReturnValue(true)
            const auth = new Auth(mockClient)
            expect(auth.isUserAuthenticated()).toBe(true)
        })

        it('returns false when user is not authenticated', () => {
            mockTokenClient.isAuthenticated.mockReturnValue(false)
            const auth = new Auth(mockClient)
            expect(auth.isUserAuthenticated()).toBe(false)
        })
    })

    describe('getSessionToken()', () => {
        it('returns session token from tokenClient', () => {
            mockTokenClient.getSessionToken.mockReturnValue('session-token-123')
            const auth = new Auth(mockClient)
            expect(auth.getSessionToken()).toBe('session-token-123')
        })

        it('returns null when no session token exists', () => {
            mockTokenClient.getSessionToken.mockReturnValue(null)
            const auth = new Auth(mockClient)
            expect(auth.getSessionToken()).toBeNull()
        })
    })

    describe('getCurrentUser()', () => {
        it('returns null when not authenticated', async () => {
            mockTokenClient.isAuthenticated.mockReturnValue(false)
            const auth = new Auth(mockClient)
            const result = await auth.getCurrentUser()
            expect(result).toBeNull()
        })

        it('fetches user data when authenticated', async () => {
            mockTokenClient.isAuthenticated.mockReturnValue(true)
            const userData = { username: 'testuser', email: 'test@example.com' }
            mockHttpClient.get.mockResolvedValue(userData)

            const auth = new Auth(mockClient)
            const result = await auth.getCurrentUser()

            expect(mockHttpClient.get).toHaveBeenCalledWith('api/users/me/')
            expect(result).toEqual(userData)
        })

        it('returns null on API error', async () => {
            mockTokenClient.isAuthenticated.mockReturnValue(true)
            mockHttpClient.get.mockRejectedValue(new Error('API Error'))

            const auth = new Auth(mockClient)
            const result = await auth.getCurrentUser()

            expect(result).toBeNull()
        })
    })
})

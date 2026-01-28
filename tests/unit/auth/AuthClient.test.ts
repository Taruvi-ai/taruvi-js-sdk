import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Auth } from '../../../src/lib/auth/AuthClient.js'
import { Client } from '../../../src/client.js'

const mockTokenClient = {
    isAuthenticated: vi.fn(),
    getToken: vi.fn(),
    getRefreshToken: vi.fn(),
    isTokenExpired: vi.fn(),
    clearTokens: vi.fn(),
    updateAccessToken: vi.fn(),
    updateRefreshToken: vi.fn()
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

    describe('getAccessToken()', () => {
        it('returns access token from tokenClient', () => {
            mockTokenClient.getToken.mockReturnValue('access-token-123')
            const auth = new Auth(mockClient)
            expect(auth.getAccessToken()).toBe('access-token-123')
        })

        it('returns null when no token exists', () => {
            mockTokenClient.getToken.mockReturnValue(null)
            const auth = new Auth(mockClient)
            expect(auth.getAccessToken()).toBeNull()
        })
    })

    describe('getRefreshToken()', () => {
        it('returns refresh token from tokenClient', () => {
            mockTokenClient.getRefreshToken.mockReturnValue('refresh-token-456')
            const auth = new Auth(mockClient)
            expect(auth.getRefreshToken()).toBe('refresh-token-456')
        })

        it('returns null when no refresh token exists', () => {
            mockTokenClient.getRefreshToken.mockReturnValue(null)
            const auth = new Auth(mockClient)
            expect(auth.getRefreshToken()).toBeNull()
        })
    })

    describe('isTokenExpired()', () => {
        it('returns true when token is expired', () => {
            mockTokenClient.isTokenExpired.mockReturnValue(true)
            const auth = new Auth(mockClient)
            expect(auth.isTokenExpired()).toBe(true)
        })

        it('returns false when token is valid', () => {
            mockTokenClient.isTokenExpired.mockReturnValue(false)
            const auth = new Auth(mockClient)
            expect(auth.isTokenExpired()).toBe(false)
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

    describe('refreshAccessToken()', () => {
        it('returns null when no refresh token available', async () => {
            mockTokenClient.getRefreshToken.mockReturnValue(null)
            const auth = new Auth(mockClient)
            const result = await auth.refreshAccessToken()
            expect(result).toBeNull()
        })
    })
})

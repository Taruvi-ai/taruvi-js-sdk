import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
        it('returns true when the stored session is valid', async () => {
            mockTokenClient.isAuthenticated.mockReturnValue(true)
            mockHttpClient.get.mockResolvedValue({})
            const auth = new Auth(mockClient)
            await expect(auth.isUserAuthenticated()).resolves.toBe(true)
        })

        it('returns false without a stored session token', async () => {
            mockTokenClient.isAuthenticated.mockReturnValue(false)
            const auth = new Auth(mockClient)
            await expect(auth.isUserAuthenticated()).resolves.toBe(false)
        })
    })

    describe('hosted sign-in redirects', () => {
        const location = { href: '', origin: 'https://app.test.com', pathname: '/tasks' }

        beforeEach(() => {
            location.href = ''
            vi.stubGlobal('window', { location })
        })

        afterEach(() => {
            vi.unstubAllGlobals()
        })

        it('login() and signup() both use deskUrl', () => {
            const auth = new Auth(mockClient)
            const callback = encodeURIComponent('https://app.test.com/tasks')

            auth.login()
            expect(location.href).toBe(`https://desk.test.com/accounts/login/?redirect_to=${callback}`)

            auth.signup()
            expect(location.href).toBe(`https://desk.test.com/accounts/signup/?redirect_to=${callback}`)
        })

        it('logout() clears the session and returns to the app origin', async () => {
            const auth = new Auth(mockClient)
            await auth.logout()
            expect(mockTokenClient.clearTokens).toHaveBeenCalled()
            expect(location.href).toBe(
                `https://desk.test.com/accounts/logout/?redirect_to=${encodeURIComponent('https://app.test.com')}`
            )
        })
    })

    describe('outside a browser', () => {
        afterEach(() => {
            vi.unstubAllGlobals()
        })

        it('login() does not throw when window has no location (React Native)', () => {
            vi.stubGlobal('window', {})
            expect(() => new Auth(mockClient).login()).not.toThrow()
        })

        it('logout() still clears the stored session', async () => {
            await new Auth(mockClient).logout()
            expect(mockTokenClient.clearTokens).toHaveBeenCalled()
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

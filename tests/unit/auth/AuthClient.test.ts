import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Auth } from '../../../src/lib/auth/AuthClient.js'
import { Client } from '../../../src/client.js'

const mockTokenClient = {
    isAuthenticated: vi.fn(),
    getToken: vi.fn(),
    getSessionToken: vi.fn(),
    clearTokens: vi.fn(),
    setTokens: vi.fn(),
}

const mockHttpClient = {
    get: vi.fn(),
    post: vi.fn(),
    send: vi.fn(),
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

    describe('headless flow', () => {
        const authenticated = { status: 200, data: { status: 200, meta: { is_authenticated: true, session_token: 'tok-1' } } }

        it('loginWithPassword stores the session token', async () => {
            mockHttpClient.send.mockResolvedValue(authenticated)
            const auth = new Auth(mockClient)
            const result = await auth.loginWithPassword({ email: 'a@b.c', password: 'pw' })
            expect(result).toEqual({ status: 'authenticated' })
            expect(mockTokenClient.clearTokens).toHaveBeenCalled()
            expect(mockHttpClient.send).toHaveBeenCalledWith('post', '_allauth/app/v1/auth/login', { email: 'a@b.c', password: 'pw' })
            expect(mockTokenClient.setTokens).toHaveBeenCalledWith({ sessionToken: 'tok-1' })
        })

        it('loginWithPassword keeps the pending token when 2FA is required', async () => {
            mockHttpClient.send.mockResolvedValue({
                status: 401,
                data: {
                    status: 401,
                    data: { flows: [{ id: 'login' }, { id: 'mfa_authenticate', is_pending: true, types: ['totp'] }] },
                    meta: { is_authenticated: false, session_token: 'pending' },
                },
            })
            const auth = new Auth(mockClient)
            expect(await auth.loginWithPassword({ email: 'a@b.c', password: 'pw' })).toEqual({ status: 'mfa_required', types: ['totp'] })
            // Not stored: a session check (Refine re-runs check() after login) would 401 and wipe it.
            expect(mockTokenClient.setTokens).not.toHaveBeenCalled()

            // A wrong code keeps the pending token so the user can retry.
            mockHttpClient.send.mockResolvedValueOnce({ status: 400, data: { status: 400, errors: [{ message: 'Incorrect code.' }] } })
            await expect(auth.mfaAuthenticate('000000')).rejects.toMatchObject({ statusCode: 400 })

            mockHttpClient.send.mockResolvedValueOnce(authenticated)
            expect(await auth.mfaAuthenticate('123456')).toEqual({ status: 'authenticated' })
            expect(mockHttpClient.send).toHaveBeenLastCalledWith(
                'post', '_allauth/app/v1/auth/2fa/authenticate', { code: '123456' }, { 'X-Session-Token': 'pending' }
            )
        })

        it('loginWithPassword throws a validation error with field errors on 400', async () => {
            mockHttpClient.send.mockResolvedValue({
                status: 400,
                data: { status: 400, errors: [{ message: 'The email address and/or password you specified are not correct.', code: 'email_password_mismatch', param: 'password' }] },
            })
            const auth = new Auth(mockClient)
            await expect(auth.loginWithPassword({ email: 'a@b.c', password: 'bad' })).rejects.toMatchObject({
                statusCode: 400,
                message: 'The email address and/or password you specified are not correct.',
                errors: { password: ['The email address and/or password you specified are not correct.'] },
            })
        })

        it('mfaAuthenticate completes the login', async () => {
            mockHttpClient.send.mockResolvedValue(authenticated)
            const auth = new Auth(mockClient)
            expect(await auth.mfaAuthenticate('123456')).toEqual({ status: 'authenticated' })
            expect(mockHttpClient.send).toHaveBeenCalledWith('post', '_allauth/app/v1/auth/2fa/authenticate', { code: '123456' }, undefined)
        })

        it('signupWithPassword sends attributes as flat fields', async () => {
            mockHttpClient.send.mockResolvedValue(authenticated)
            const auth = new Auth(mockClient)
            await auth.signupWithPassword({ email: 'a@b.c', password: 'pw', firstName: 'Jo', attributes: { department: 'ops' } })
            expect(mockHttpClient.send).toHaveBeenCalledWith('post', '_allauth/app/v1/auth/signup', {
                department: 'ops', email: 'a@b.c', password: 'pw', first_name: 'Jo',
            })
        })

        it('signupWithPassword throws ForbiddenError when signup is closed', async () => {
            mockHttpClient.send.mockResolvedValue({ status: 403, data: { status: 403 } })
            const auth = new Auth(mockClient)
            await expect(auth.signupWithPassword({ email: 'a@b.c', password: 'pw' })).rejects.toMatchObject({ statusCode: 403 })
        })

        it('requestPasswordReset passes reset_url', async () => {
            mockHttpClient.send.mockResolvedValue({ status: 200, data: { status: 200 } })
            const auth = new Auth(mockClient)
            await auth.requestPasswordReset('a@b.c', 'https://app.example.org/update-password')
            expect(mockHttpClient.send).toHaveBeenCalledWith('post', '_allauth/app/v1/auth/password/request', {
                email: 'a@b.c', reset_url: 'https://app.example.org/update-password',
            })
        })

        it('resetPassword logs in on success and reports unauthenticated on plain 401', async () => {
            const auth = new Auth(mockClient)
            mockHttpClient.send.mockResolvedValueOnce(authenticated)
            expect(await auth.resetPassword('k', 'pw')).toEqual({ status: 'authenticated' })
            mockHttpClient.send.mockResolvedValueOnce({ status: 401, data: { status: 401, data: { flows: [] }, meta: { is_authenticated: false } } })
            expect(await auth.resetPassword('k', 'pw')).toEqual({ status: 'unauthenticated' })
        })

        it('logoutSession deletes the session and always clears the token', async () => {
            mockTokenClient.isAuthenticated.mockReturnValue(true)
            mockHttpClient.send.mockResolvedValue({ status: 401, data: {} })
            const auth = new Auth(mockClient)
            await auth.logoutSession()
            expect(mockHttpClient.send).toHaveBeenCalledWith('delete', '_allauth/app/v1/auth/session')
            expect(mockTokenClient.clearTokens).toHaveBeenCalled()
        })

        it('logoutSession clears the token and does not throw when offline', async () => {
            mockTokenClient.isAuthenticated.mockReturnValue(true)
            mockHttpClient.send.mockRejectedValue(new Error('Network Error'))
            const auth = new Auth(mockClient)
            await expect(auth.logoutSession()).resolves.toBeUndefined()
            expect(mockTokenClient.clearTokens).toHaveBeenCalled()
        })
    })
})

import { getRuntimeEnvironment } from "../../utils/utils.js"

/**
 * Token management interface for Web UI Flow authentication
 */
export interface AuthTokens {
    sessionToken?: string | undefined;
    accessToken: string;
    refreshToken: string;
    expiresIn?: number | undefined;
    expiresAt?: number | undefined;
    tokenType?: string | undefined;
}

/**
 * TokenClient - Manages authentication tokens for both browser and server environments
 * Implements Web UI Flow token handling as described in Taruvi documentation
 */
export class TokenClient {
    private static readonly ACCESS_TOKEN_KEY = 'jwt';
    private static readonly REFRESH_TOKEN_KEY = 'refresh_token';
    private static readonly SESSION_TOKEN_KEY = 'session_token';
    private static readonly EXPIRES_AT_KEY = 'token_expires_at';
    private static readonly TOKEN_TYPE_KEY = 'token_type';

    private runTimeEnvironment: string
    private browserRunTime: boolean
    private serverToken: string | null = null

    constructor(token?: string) {
        this.runTimeEnvironment = getRuntimeEnvironment()
        this.browserRunTime = this.runTimeEnvironment == "Browser"

        // For server-side usage, store the token
        if (!this.browserRunTime && token) {
            this.serverToken = token
        }
    }

    /**
     * Get access token (supports both browser and server)
     */
    getToken(): string | null {
        if (this.browserRunTime) {
            if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
                return null
            }
            return localStorage.getItem(TokenClient.ACCESS_TOKEN_KEY)
        }
        return this.serverToken
    }

    /**
     * Set all authentication tokens from Web UI Flow callback
     */
    setTokens(tokens: AuthTokens): void {
        if (!this.browserRunTime) {
            console.warn('Token storage is only available in browser environment')
            return
        }

        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            return
        }

        try {
            // Store access token
            localStorage.setItem(TokenClient.ACCESS_TOKEN_KEY, tokens.accessToken)

            // Store refresh token
            localStorage.setItem(TokenClient.REFRESH_TOKEN_KEY, tokens.refreshToken)

            // Store session token if provided
            if (tokens.sessionToken) {
                localStorage.setItem(TokenClient.SESSION_TOKEN_KEY, tokens.sessionToken)
            }

            // Calculate and store expiration time
            if (tokens.expiresIn) {
                const expiresAt = Date.now() + (tokens.expiresIn * 1000)
                localStorage.setItem(TokenClient.EXPIRES_AT_KEY, expiresAt.toString())
            } else if (tokens.expiresAt) {
                localStorage.setItem(TokenClient.EXPIRES_AT_KEY, tokens.expiresAt.toString())
            }

            // Store token type
            if (tokens.tokenType) {
                localStorage.setItem(TokenClient.TOKEN_TYPE_KEY, tokens.tokenType)
            }
        } catch (err) {
            console.error('Failed to store authentication tokens:', err)
        }
    }

    /**
     * Get all stored tokens
     */
    getTokens(): AuthTokens | null {
        if (!this.browserRunTime) {
            return null
        }

        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            return null
        }

        try {
            const accessToken = localStorage.getItem(TokenClient.ACCESS_TOKEN_KEY)
            const refreshToken = localStorage.getItem(TokenClient.REFRESH_TOKEN_KEY)
            const sessionToken = localStorage.getItem(TokenClient.SESSION_TOKEN_KEY)
            const expiresAt = localStorage.getItem(TokenClient.EXPIRES_AT_KEY)
            const tokenType = localStorage.getItem(TokenClient.TOKEN_TYPE_KEY)

            if (!accessToken || !refreshToken) {
                return null
            }

            const tokens: AuthTokens = {
                accessToken,
                refreshToken,
                tokenType: tokenType || 'Bearer',
            }

            if (sessionToken) {
                tokens.sessionToken = sessionToken
            }

            if (expiresAt) {
                tokens.expiresIn = Math.floor((parseInt(expiresAt) - Date.now()) / 1000)
                tokens.expiresAt = parseInt(expiresAt)
            }

            return tokens
        } catch (err) {
            console.error('Failed to retrieve authentication tokens:', err)
            return null
        }
    }

    /**
     * Get refresh token
     */
    getRefreshToken(): string | null {
        if (!this.browserRunTime) {
            return null
        }

        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            return null
        }

        return localStorage.getItem(TokenClient.REFRESH_TOKEN_KEY)
    }

    /**
     * Get session token
     */
    getSessionToken(): string | null {
        if (!this.browserRunTime) {
            return null
        }

        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            return null
        }

        return localStorage.getItem(TokenClient.SESSION_TOKEN_KEY)
    }

    /**
     * Check if user is authenticated (has valid access token)
     */
    isAuthenticated(): boolean {
        return !!this.getToken()
    }

    /**
     * Check if access token is expired
     */
    isTokenExpired(): boolean {
        if (!this.browserRunTime) {
            return true
        }

        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            return true
        }

        const expiresAt = localStorage.getItem(TokenClient.EXPIRES_AT_KEY)
        if (!expiresAt) {
            return true
        }

        return parseInt(expiresAt) < Date.now()
    }

    /**
     * Update access token after refresh
     * ⚠️ IMPORTANT: Taruvi uses refresh token rotation
     * When you refresh, you get BOTH a new access token AND a new refresh token
     */
    updateAccessToken(accessToken: string, expiresIn: number): void {
        if (!this.browserRunTime) {
            console.warn('Token update is only available in browser environment')
            return
        }

        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            return
        }

        try {
            localStorage.setItem(TokenClient.ACCESS_TOKEN_KEY, accessToken)
            const expiresAt = Date.now() + (expiresIn * 1000)
            localStorage.setItem(TokenClient.EXPIRES_AT_KEY, expiresAt.toString())
        } catch (err) {
            console.error('Failed to update access token:', err)
        }
    }

    /**
     * Update refresh token after rotation
     * ⚠️ IMPORTANT: Taruvi rotates refresh tokens
     * Always update the refresh token when you receive a new one
     */
    updateRefreshToken(refreshToken: string): void {
        if (!this.browserRunTime) {
            console.warn('Token update is only available in browser environment')
            return
        }

        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            return
        }

        try {
            localStorage.setItem(TokenClient.REFRESH_TOKEN_KEY, refreshToken)
        } catch (err) {
            console.error('Failed to update refresh token:', err)
        }
    }

    /**
     * Clear all tokens (logout)
     */
    clearTokens(): void {
        if (!this.browserRunTime) {
            this.serverToken = null
            return
        }

        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            return
        }

        try {
            localStorage.removeItem(TokenClient.ACCESS_TOKEN_KEY)
            localStorage.removeItem(TokenClient.REFRESH_TOKEN_KEY)
            localStorage.removeItem(TokenClient.SESSION_TOKEN_KEY)
            localStorage.removeItem(TokenClient.EXPIRES_AT_KEY)
            localStorage.removeItem(TokenClient.TOKEN_TYPE_KEY)
        } catch (err) {
            console.error('Failed to clear tokens:', err)
        }
    }
}

import { getRuntimeEnvironment } from "../../utils/utils.js"

/**
 * TokenClient - Manages session token for browser authentication
 */
export interface AuthTokens {
    sessionToken: string;
}

export class TokenClient {
    private static readonly SESSION_TOKEN_KEY = 'session_token';

    private runTimeEnvironment: string
    private browserRunTime: boolean
    private serverToken: string | null = null

    constructor(token?: string) {
        this.runTimeEnvironment = getRuntimeEnvironment()
        this.browserRunTime = this.runTimeEnvironment == "Browser"

        if (!this.browserRunTime && token) {
            this.serverToken = token
        }
    }

    /**
     * Get session token
     */
    getSessionToken(): string | null {
        if (this.browserRunTime) {
            if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
                return null
            }
            return localStorage.getItem(TokenClient.SESSION_TOKEN_KEY)
        }
        return this.serverToken
    }

    /**
     * Alias for getSessionToken (used by server-side code)
     */
    getToken(): string | null {
        return this.getSessionToken()
    }

    /**
     * Store session token
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
            localStorage.setItem(TokenClient.SESSION_TOKEN_KEY, tokens.sessionToken)
        } catch (err) {
            console.error('Failed to store session token:', err)
        }
    }

    /**
     * Set session token directly
     */
    setAccessToken(token: string): void {
        if (this.browserRunTime) {
            if (typeof window === 'undefined' || typeof localStorage === 'undefined') return
            try {
                localStorage.setItem(TokenClient.SESSION_TOKEN_KEY, token)
            } catch (err) {
                console.error('Failed to set session token:', err)
            }
        } else {
            this.serverToken = token
        }
    }

    /**
     * Check if user is authenticated (has a session token)
     */
    isAuthenticated(): boolean {
        return !!this.getSessionToken()
    }

    /**
     * Check if running in browser environment
     */
    isBrowserRuntime(): boolean {
        return this.browserRunTime
    }

    /**
     * Clear session token
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
            localStorage.removeItem(TokenClient.SESSION_TOKEN_KEY)
        } catch (err) {
            console.error('Failed to clear session token:', err)
        }
    }
}

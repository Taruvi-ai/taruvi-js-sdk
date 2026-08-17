import type { Client } from "../../client.js";
import type { TaruviResponse } from "../../types.js";
import type { UserData } from "../users/types.js";
import { AuthRoutes } from "../../lib-internal/routes/AuthRoutes.js";
import { UserRoutes } from "../../lib-internal/routes/UserRoutes.js";

/**
 * Auth Client - Handles user authentication using Web UI Flow
 * Uses session token for API authentication via X-Session-Token header.
 * On a session-invalidating response (401/410/419), tokens are cleared automatically by the
 * HttpClient interceptor (403 does not clear the token — it means authenticated but unauthorized).
 */
export class Auth {
    private client: Client

    constructor(client: Client) {
        this.client = client
    }

    /**
     * Redirect to login page (Web UI Flow)
     */
    login(callbackUrl?: string): void {
        if (typeof window === "undefined") {
            console.error("login() can only be called in browser environment")
            return
        }

        const config = this.client.getConfig()
        const callback = callbackUrl || window.location.origin + window.location.pathname
        const deskUrl = config.deskUrl || config.apiUrl
        const loginUrl = `${deskUrl}/accounts/login/?redirect_to=${encodeURIComponent(callback)}`

        if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem("auth_state", JSON.stringify({
                returnTo: window.location.pathname,
                timestamp: Date.now()
            }))
        }

        window.location.href = loginUrl
    }

    /**
     * Redirect to signup page (Web UI Flow)
     */
    signup(callbackUrl?: string): void {
        if (typeof window === "undefined") {
            console.error("signup() can only be called in browser environment")
            return
        }

        const config = this.client.getConfig()
        const callback = callbackUrl || window.location.origin + window.location.pathname
        const signupUrl = `${config.apiUrl}/accounts/signup/?redirect_to=${encodeURIComponent(callback)}`

        if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem("auth_state", JSON.stringify({
                returnTo: window.location.pathname,
                timestamp: Date.now()
            }))
        }

        window.location.href = signupUrl
    }

    /**
     * Logout user and redirect to logout page
     */
    async logout(callbackUrl?: string): Promise<void> {
        if (typeof window === "undefined") {
            console.error("logout() can only be called in browser environment")
            return
        }

        this.client.tokenClient.clearTokens()

        const config = this.client.getConfig()
        const deskUrl = config.deskUrl || config.apiUrl
        let callback: string = callbackUrl || ""

        if (!callback) {
            try {
                const settings = await this.client.httpClient.get<{ frontend_url?: string }>(
                    `api/sites/${config.appSlug}/metadata`
                )
                callback = settings.frontend_url || window.location.origin
            } catch (error) {
                console.error("Failed to fetch site settings, using origin:", error)
                callback = window.location.origin
            }
        }

        const logoutUrl = `${deskUrl}/accounts/logout/?redirect_to=${encodeURIComponent(callback)}`
        window.location.href = logoutUrl
    }

    /**
     * Sign in with email and password 
     * @param email - User's email address
     * @param password - User's password
     * @returns Promise that resolves to true on successful login
     * @throws Error if credentials are invalid or login fails
     */
    async signInWithPassword(
        email: string,
        password: string,
    ): Promise<boolean | string> {
        try {
            const response = await this.client.httpClient.post<{
                meta?: { session_token?: string }
                session_token?: string
                user?: unknown
                methods?: unknown[]
            }>(AuthRoutes.login(), { email, password })

            const sessionToken =
                (typeof response?.meta?.session_token === "string" &&
                    response.meta.session_token) ||
                (typeof response?.session_token === "string" &&
                    response.session_token) ||
                null

            if (!sessionToken) {
                throw new Error("Login succeeded but no session_token was returned")
            }

            // Server: return the token to the caller.
            if (!this.client.tokenClient.isBrowserRuntime()) {
                return sessionToken
            }

            // Browser: store the token in the TokenClient.
            this.client.tokenClient.setTokens({ sessionToken })

            return true
        } catch (error: unknown) {
            const err = error as {
                statusCode?: number
                code?: string
                errors?: unknown
                data?: { errors?: Array<{ code?: string }> }
                message?: string
            }

            const mismatchCode =
                err?.data?.errors?.[0]?.code === "email_password_mismatch" ||
                (Array.isArray(err?.errors) &&
                    (err.errors as Array<{ code?: string }>)[0]?.code ===
                        "email_password_mismatch")

            if (err?.statusCode === 400 || mismatchCode) {
                throw new Error("Invalid email or password")
            }

            if (error instanceof Error) {
                throw error
            }

            throw new Error("Unable to sign in. Please try again.")
        }
    }

    /**
     * Check if a session token exists locally (does not validate with server)
     */
    hasToken(): boolean {
        return this.client.tokenClient.isAuthenticated()
    }

    /**
     * Check if user is authenticated by validating session with the server
     */
    async isUserAuthenticated(): Promise<boolean> {
        if (!this.hasToken()) return false
        try {
            await this.validateSession()
            return true
        } catch {
            return false
        }
    }

    /**
     * Validate current session token with auth session endpoint.
     * HttpClient injects X-Session-Token automatically.
     */
    async validateSession(): Promise<void> {
        await this.client.httpClient.get(AuthRoutes.session())
    }

    /**
     * Get the current session token
     */
    getSessionToken(): string | null {
        return this.client.tokenClient.getSessionToken()
    }

    /**
     * Get current user from API
     * @returns Promise with user data or null if not authenticated
     */
    async getCurrentUser(): Promise<TaruviResponse<UserData> | null> {
        if (!this.hasToken()) {
            return null
        }

        try {
            return await this.client.httpClient.get<TaruviResponse<UserData>>(UserRoutes.getCurrentUser())
        } catch (error) {
            console.error("Failed to fetch current user:", error)
            return null
        }
    }
}

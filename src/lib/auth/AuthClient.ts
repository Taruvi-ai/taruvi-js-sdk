import type { Client } from "../../client.js";
import type { TaruviResponse } from "../../types.js";
import type { UserData } from "../users/types.js";
import { AuthRoutes } from "../../lib-internal/routes/AuthRoutes.js";
import { UserRoutes } from "../../lib-internal/routes/UserRoutes.js";
import { captureSessionFromUrl } from "../../lib-internal/token/redirect.js";

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
        if (typeof window === "undefined" || !window.location) {
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
        if (typeof window === "undefined" || !window.location) {
            console.error("signup() can only be called in browser environment")
            return
        }

        const config = this.client.getConfig()
        const callback = callbackUrl || window.location.origin + window.location.pathname
        const deskUrl = config.deskUrl || config.apiUrl
        const signupUrl = `${deskUrl}/accounts/signup/?redirect_to=${encodeURIComponent(callback)}`

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
        // Forget the session in every runtime; only a browser can be redirected.
        this.client.tokenClient.clearTokens()

        if (typeof window === "undefined" || !window.location) {
            return
        }

        const config = this.client.getConfig()
        const deskUrl = config.deskUrl || config.apiUrl
        // The platform exposes no per-app frontend URL, so default to this app's origin.
        const callback = callbackUrl || window.location.origin

        const logoutUrl = `${deskUrl}/accounts/logout/?redirect_to=${encodeURIComponent(callback)}`
        window.location.href = logoutUrl
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
     * Stores the session token that hosted sign-in added to the address, and
     * removes the sign-in values from the address bar. Call it on the page users
     * return to when the client was created with `detectSessionInUrl: false`.
     * @returns The captured session token, or `null` when the address has none.
     */
    handleRedirect(url?: string): string | null {
        return captureSessionFromUrl(this.client.tokenClient, url)
    }

    /**
     * Uses `sessionToken` for later requests, for example one your app keeps in
     * a cookie so server-rendered pages can act as the user.
     */
    setSession(sessionToken: string): void {
        this.client.tokenClient.setAccessToken(sessionToken)
    }

    /** Forgets the stored session without redirecting. Use `logout()` to also end it on TaruviBase. */
    clearSession(): void {
        this.client.tokenClient.clearTokens()
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

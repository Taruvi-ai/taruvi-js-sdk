import type { Client } from "../../client.js";
import type { TaruviResponse } from "../../types.js";
import type { UserData } from "../users/types.js";
import { AuthRoutes } from "../../lib-internal/routes/AuthRoutes.js";
import { UserRoutes } from "../../lib-internal/routes/UserRoutes.js";

/**
 * Auth Client - Handles user authentication using Web UI Flow
 * Uses session token for API authentication via X-Session-Token header.
 * On 401, tokens are cleared automatically by HttpClient interceptor (403 does not clear the token).
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

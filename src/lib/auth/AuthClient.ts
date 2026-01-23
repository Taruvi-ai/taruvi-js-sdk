import type { Client } from "../../client.js";
import type { UserDataResponse } from "../user/types.js";
import { UserRoutes } from "../../lib-internal/routes/UserRoutes.js";

/**
 * Auth Client - Handles user authentication using Web UI Flow
 * Implements cross-domain authentication with redirect-based token delivery
 *
 * Flow:
 * 1. User calls login() → Redirects to backend /accounts/login/
 * 2. User authenticates on backend
 * 3. Backend redirects back with tokens in URL hash
 * 4. Client extracts and stores tokens automatically
 */
export class Auth {
    private client: Client

    constructor(client: Client) {
        this.client = client
    }

    /**
     * Redirect to login page (Web UI Flow)
     * @param callbackUrl - URL to redirect to after successful login (defaults to current page)
     */
    login(callbackUrl?: string): void {
        if (typeof window === "undefined") {
            console.error("login() can only be called in browser environment")
            return
        }

        const config = this.client.getConfig()
        const callback = callbackUrl || window.location.origin + window.location.pathname
        const deskUrl = config.deskUrl || config.baseUrl

        // Redirect to /accounts/login/ with redirect_to parameter
        const loginUrl = `${deskUrl}/accounts/login/?redirect_to=${encodeURIComponent(callback)}`

        // Optional: Store state before redirecting
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
     * @param callbackUrl - URL to redirect to after successful signup (defaults to current page)
     */
    signup(callbackUrl?: string): void {
        if (typeof window === "undefined") {
            console.error("signup() can only be called in browser environment")
            return
        }

        const config = this.client.getConfig()
        const callback = callbackUrl || window.location.origin + window.location.pathname

        // Redirect to /accounts/signup/ with redirect_to parameter
        const signupUrl = `${config.baseUrl}/accounts/signup/?redirect_to=${encodeURIComponent(callback)}`

        // Optional: Store state before redirecting
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
     * Fetches frontendUrl from site settings for redirect
     * @param callbackUrl - URL to redirect to after logout (overrides frontendUrl from settings)
     */
    async logout(callbackUrl?: string): Promise<void> {
        if (typeof window === "undefined") {
            console.error("logout() can only be called in browser environment")
            return
        }

        // Clear tokens immediately
        this.client.tokenClient.clearTokens()

        const config = this.client.getConfig()
        const deskUrl = config.deskUrl || config.baseUrl
        let callback: string = callbackUrl || ""

        // If no callback provided, fetch frontendUrl from site settings
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

        // Redirect to /accounts/logout/
        const logoutUrl = `${deskUrl}/accounts/logout/?redirect_to=${encodeURIComponent(callback)}`

        window.location.href = logoutUrl
    }

    /**
     * Check if user is authenticated
     */
    isUserAuthenticated(): boolean {
        return this.client.tokenClient.isAuthenticated()
    }

    /**
     * Get the current access token
     */
    getAccessToken(): string | null {
        return this.client.tokenClient.getToken()
    }

    /**
     * Get the current refresh token
     */
    getRefreshToken(): string | null {
        return this.client.tokenClient.getRefreshToken()
    }

    /**
     * Check if the access token is expired
     */
    isTokenExpired(): boolean {
        return this.client.tokenClient.isTokenExpired()
    }

    /**
     * Refresh the access token using the refresh token
     * ⚠️ IMPORTANT: Taruvi uses refresh token rotation
     * You will receive BOTH a new access token AND a new refresh token
     *
     * @returns Promise with new tokens or null if refresh failed
     */
    async refreshAccessToken(): Promise<{ access: string; refresh: string; expires_in: number } | null> {
        const refreshToken = this.client.tokenClient.getRefreshToken()

        if (!refreshToken) {
            console.error("No refresh token available")
            return null
        }

        try {
            const config = this.client.getConfig()
            const response = await fetch(`${config.baseUrl}/api/cloud/auth/jwt/token/refresh/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refresh: refreshToken })
            })

            if (!response.ok) {
                throw new Error(`Token refresh failed: ${response.statusText}`)
            }

            const data = await response.json()

            // Update tokens in storage (both access and refresh due to rotation)
            this.client.tokenClient.updateAccessToken(data.access, data.expires_in || 172800)

            if (data.refresh) {
                this.client.tokenClient.updateRefreshToken(data.refresh)
            }

            return {
                access: data.access,
                refresh: data.refresh || refreshToken,
                expires_in: data.expires_in || 172800
            }
        } catch (error) {
            console.error("Failed to refresh access token:", error)

            // Clear tokens and redirect to login
            this.client.tokenClient.clearTokens()

            if (typeof window !== "undefined") {
                this.login()
            }

            return null
        }
    }

    /**
     * Get current user from API
     * @returns Promise with user data or null if not authenticated
     */
    async getCurrentUser(): Promise<UserDataResponse | null> {
        if (!this.isUserAuthenticated()) {
            return null
        }

        try {
            return await this.client.httpClient.get<UserDataResponse>(UserRoutes.getCurrentUser())
        } catch (error) {
            console.error("Failed to fetch current user:", error)
            return null
        }
    }
}
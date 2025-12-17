import type { Client } from "../../client.js";

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

        // Redirect to /accounts/login/ with redirect_to parameter
        const loginUrl = `${config.baseUrl}/accounts/login/?redirect_to=${encodeURIComponent(callback)}`

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
     * @param callbackUrl - URL to redirect to after logout (defaults to home page)
     */
    logout(callbackUrl?: string): void {
        if (typeof window === "undefined") {
            console.error("logout() can only be called in browser environment")
            return
        }

        // Clear tokens immediately
        this.client.tokenClient.clearTokens()

        const config = this.client.getConfig()
        const callback = callbackUrl || window.location.origin

        // Redirect to /accounts/logout/
        const logoutUrl = `${config.baseUrl}/accounts/logout/?redirect_to=${encodeURIComponent(callback)}`

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
     * Get current user info from access token (JWT decode)
     * Note: This only decodes the token, doesn't validate signature
     */
    getCurrentUser(): any | null {
        const accessToken = this.getAccessToken()

        if (!accessToken) {
            return null
        }

        try {
            // Decode JWT (middle part is payload)
            const parts = accessToken.split(".")
            if (parts.length !== 3 || !parts[1]) {
                throw new Error("Invalid JWT format")
            }
            const payload = JSON.parse(atob(parts[1]))
            return payload
        } catch (error) {
            console.error("Failed to decode access token:", error)
            return null
        }
    }

    /**
     * Legacy method: Redirect to login using desk URL
     * @deprecated Use login() instead
     */
    async redirectToLogin(): Promise<void> {
        const config = this.client.getConfig()
        const currentUrl = typeof window !== "undefined" ? window.location.href : ""

        const deskUrl = config.deskUrl || config.baseUrl
        if (typeof window !== "undefined") {
            window.location.href = `${deskUrl}?redirect=${encodeURIComponent(currentUrl)}`
        }
    }
}
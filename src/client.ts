import { HttpClient } from "./lib-internal/http/HttpClient.js";
import { TokenClient, type AuthTokens } from "./lib-internal/token/TokenClient.js";
import type { TaruviConfig } from "./types.js";

export class Client {
    private readonly config: TaruviConfig
    private readonly _httpClient: HttpClient
    private readonly _tokenClient: TokenClient

    constructor(config: TaruviConfig) {
        if (!config) {
            throw new Error("Config is required")
        }

        if (!config.apiKey) {
            throw new Error("API key is required")
        }

        if (!config.apiUrl) {
            throw new Error("API URL is required")
        }

        this.config = config

        // Internal clients for SDK use only
        // TokenClient must be created first, then passed to HttpClient

        this._tokenClient = new TokenClient(config.token)
        this._httpClient = new HttpClient(this.config, this._tokenClient)

        // Check URL hash for tokens (OAuth callback)
        this.extractTokensFromUrl()
    }

    /**
     * Extracts session token from URL hash and stores it using TokenClient.
     * Handles callback URLs like: #session_token=xxx
     * After extraction, the URL hash is cleared.
     */
    private extractTokensFromUrl(): void {
        if (typeof window === "undefined" || typeof localStorage === "undefined") {
            return
        }

        const hash = window.location.hash
        if (!hash) {
            return
        }

        const params = new URLSearchParams(hash.substring(1))
        const sessionToken = params.get("session_token")

        if (!sessionToken) {
            return
        }

        this._tokenClient.setTokens({ sessionToken })

        // Clear hash from URL without reloading page
        if (window.history && window.history.replaceState) {
            const urlWithoutHash = window.location.pathname + window.location.search
            window.history.replaceState(null, "", urlWithoutHash)
        }
    }

    /**
     * @internal
     * Internal use only - not part of public API
     */
    get httpClient(): HttpClient {
        return this._httpClient
    }

    /**
     * @internal
     * Internal use only - not part of public API
     */
    get tokenClient(): TokenClient {
        return this._tokenClient
    }

    getConfig(): Readonly<TaruviConfig> {
        return { ...this.config }
    }
}
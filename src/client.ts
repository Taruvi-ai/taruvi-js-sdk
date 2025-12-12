import { HttpClient } from "./lib-internal/http/HttpClient.js";
import { TokenClient } from "./lib-internal/token/TokenClient.js";
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

        if (!config.baseUrl) {
            throw new Error("Base URL is required")
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
     * Extracts access_token and refresh_token from URL hash and stores them in localStorage.
     * This handles OAuth callback URLs like: #access_token=xxx&refresh_token=xxx
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
        const accessToken = params.get("access_token")
        const refreshToken = params.get("refresh_token")

        if (accessToken) {
            localStorage.setItem("jwt", accessToken)
        }

        if (refreshToken) {
            localStorage.setItem("refresh_token", refreshToken)
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
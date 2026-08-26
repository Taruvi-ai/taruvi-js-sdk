import { HttpClient } from "./lib-internal/http/HttpClient.js";
import { TokenClient } from "./lib-internal/token/TokenClient.js";
import type { AuthMode, TaruviConfig } from "./types.js";
import packageJson from "../package.json" with { type: "json" };

const AUTH_HASH_PARAMS = new Set([
    "session_token",
    "access_token",
    "refresh_token",
    "expires_in",
    "token_type",
])

export interface RedirectCallbackResult {
    handled: boolean
    sessionToken?: string
}

export class Client {
    private readonly config: TaruviConfig
    private readonly _httpClient: HttpClient
    private readonly _tokenClient: TokenClient

    constructor(config: TaruviConfig) {
        if (!config) {
            throw new Error("Config is required")
        }

        if (!config.apiUrl) {
            throw new Error("API URL is required")
        }

        // Determine auth mode: explicit > auto-detect from environment
        const authMode: AuthMode = config.authMode
            ?? (typeof window !== "undefined" ? "browser" : "apiKey")

        if (authMode === "apiKey" && !config.apiKey) {
            throw new Error("API key is required for apiKey auth mode")
        }

        this.config = {
            ...config,
            authMode,
        }

        // Internal clients for SDK use only
        // TokenClient must be created first, then passed to HttpClient

        this._tokenClient = new TokenClient(config.token)
        this._httpClient = new HttpClient(this.config, this._tokenClient)

        if (config.autoHandleRedirect !== false) {
            this.extractTokensFromUrl()
        }

        console.info(`Taruvi SDK v${packageJson.version} initialized`)
    }

    handleRedirectCallback(url?: string): RedirectCallbackResult {
        if (typeof window === "undefined") return { handled: false }

        const hash = (url ?? window.location.href).split("#")[1]
        if (!hash) return { handled: false }

        const params = new URLSearchParams(hash)
        const sessionToken = params.get("session_token")
        if (!sessionToken) return { handled: false }

        this._tokenClient.setTokens({ sessionToken })

        for (const key of AUTH_HASH_PARAMS) params.delete(key)

        const remaining = params.toString()
        const base = window.location.pathname + window.location.search
        window.history.replaceState(null, "", remaining ? `${base}#${remaining}` : base)

        return { handled: true, sessionToken }
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

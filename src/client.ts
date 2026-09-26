import { HttpClient } from "./lib-internal/http/HttpClient.js";
import { TokenClient } from "./lib-internal/token/TokenClient.js";
import { captureSessionFromUrl } from "./lib-internal/token/redirect.js";
import { getRuntimeEnvironment } from "./utils/utils.js";
import type { TaruviConfig } from "./types.js";
import { SDK_VERSION } from "./version.js";

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

        const authMode = config.authMode ?? "session"
        if (authMode === "apiKey") {
            if (!config.apiKey) {
                throw new Error('authMode "apiKey" requires apiKey')
            }
            if (getRuntimeEnvironment() !== "Server") {
                throw new Error('authMode "apiKey" is for server code only; never ship an API key to a browser or mobile app')
            }
        }

        // Accept site and sign-in URLs with or without a trailing slash.
        this.config = {
            ...config,
            authMode,
            apiUrl: config.apiUrl.replace(/\/+$/, ""),
            ...(config.deskUrl && { deskUrl: config.deskUrl.replace(/\/+$/, "") }),
        }

        // Internal clients for SDK use only
        // TokenClient must be created first, then passed to HttpClient

        this._tokenClient = new TokenClient(config.token)
        this._httpClient = new HttpClient(this.config, this._tokenClient)

        if (authMode === "session" && config.detectSessionInUrl !== false) {
            captureSessionFromUrl(this._tokenClient)
        }

        console.info(`Taruvi SDK v${SDK_VERSION} initialized`)
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

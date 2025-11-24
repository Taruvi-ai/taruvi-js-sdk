import type { TaruviConfig } from "../../types.js";
import type { TokenClient } from "../token/TokenClient.js";
import axios from "axios";

/**
 * HttpClient handles all HTTP requests to the Taruvi API.
 * Automatically adds authentication headers:
 * - Authorization: API key for site/app identification
 * - X-Session-Token: User session token for authenticated requests
 *
 * @internal
 */
export class HttpClient {
    private config: TaruviConfig
    private tokenClient: TokenClient

    constructor(config: TaruviConfig, tokenClient: TokenClient) {
        this.config = config
        this.tokenClient = tokenClient
    }

    private getAuthHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        }

        // Site/app API key (developer authentication)
        if (this.config.apiKey) {
            headers['Authorization'] = `Token ${this.config.apiKey}`
        }

        // Tenant adming session token
        const sessionToken = localStorage.getItem("sessionid")
        if (sessionToken) {
            headers['X-Session-Token'] = sessionToken
        }

        return headers
    }

    async get<T>(endpoint: string) {
        const { data } = await axios.get(`${this.config.baseUrl}/${endpoint}`, {
            headers: this.getAuthHeaders()
        })
        return data
    }

    async post<T, D = any>(endpoint: string, body: D): Promise<T> {
        const { data } = await axios.post<T>(
            `${this.config.baseUrl}/${endpoint}`,
            body,
            {
                headers: this.getAuthHeaders()
            }
        )
        return data
    }

    async put<T, D = any>(endpoint: string, body: D) {
        const { data } = await axios.put<T>(`${this.config.baseUrl}/${endpoint}`,
            body,
            {
                headers: this.getAuthHeaders()
            })

        return data
    }

    async delete<T>(endpoint: string): Promise<T> {
        const { data } = await axios.delete<T>(
            `${this.config.baseUrl}/${endpoint}`,
            {
                headers: this.getAuthHeaders()
            }
        )
        return data
    }

    async patch<T, D = any>(endpoint: string, body: D): Promise<T> {
        const { data } = await axios.patch<T>(
            `${this.config.baseUrl}/${endpoint}`,
            body,
            {
                headers: this.getAuthHeaders()
            }
        )
        return data
    }
}

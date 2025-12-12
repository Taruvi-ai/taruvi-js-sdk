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

    private getAuthHeaders(isFormData: boolean = false): Record<string, string> {
        const headers: Record<string, string> = {}

        // Don't set Content-Type for FormData - let axios set it with the boundary
        if (!isFormData) {
            headers['Content-Type'] = 'application/json'
        }

        // Site/app API key (developer authentication)
        if (this.config.apiKey) {
            headers['Authorization'] = `Token ${this.config.apiKey}`
        }

        // Tenant admin session token
        const jwt = this.tokenClient.getToken()
        if (jwt) {
            headers['Authorization'] = `Bearer ${jwt}`
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
        const isFormData = body instanceof FormData
        const { data } = await axios.post<T>(
            `${this.config.baseUrl}/${endpoint}`,
            body,
            {
                headers: this.getAuthHeaders(isFormData)
            }
        )
        return data
    }

    async put<T, D = any>(endpoint: string, body: D) {
        const isFormData = body instanceof FormData
        const { data } = await axios.put<T>(`${this.config.baseUrl}/${endpoint}`,
            body,
            {
                headers: this.getAuthHeaders(isFormData)
            })

        return data
    }

    async delete<T, D = any>(endpoint: string, body?: D): Promise<T> {
        const { data } = await axios.delete<T>(
            `${this.config.baseUrl}/${endpoint}`,
            {
                headers: this.getAuthHeaders(),
                data: body
            }
        )
        return data
    }

    async patch<T, D = any>(endpoint: string, body: D): Promise<T> {
        const isFormData = body instanceof FormData
        const { data } = await axios.patch<T>(
            `${this.config.baseUrl}/${endpoint}`,
            body,
            {
                headers: this.getAuthHeaders(isFormData)
            }
        )
        return data
    }
}

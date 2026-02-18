import type { TaruviConfig } from "../../types.js";
import type { TokenClient } from "../token/TokenClient.js";
import axios, { AxiosError } from "axios";
import { createErrorFromResponse, NetworkError, TaruviError } from "../errors/index.js";
import type { ErrorResponseBody } from "../errors/index.js";

/**
 * HttpClient handles all HTTP requests to the Taruvi API.
 * Automatically adds authentication headers and converts
 * error responses to typed SDK errors.
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

        // Tenant admin session token
        const jwt = this.tokenClient.getToken()
        if (jwt) {
            headers['Authorization'] = `Bearer ${jwt}`
        }

        return headers
    }

    private handleError(error: unknown): never {
        if (error instanceof TaruviError) {
            throw error
        }

        if (error instanceof AxiosError) {
            if (error.response) {
                const body = error.response.data as ErrorResponseBody | undefined
                throw createErrorFromResponse(error.response.status, body)
            }
            // No response — network error
            throw new NetworkError(error.message)
        }

        // Unknown error
        throw error
    }

    async get<T>(endpoint: string): Promise<T> {
        try {
            const { data } = await axios.get<T>(`${this.config.apiUrl}/${endpoint}`, {
                headers: this.getAuthHeaders()
            })
            return data
        } catch (error) {
            this.handleError(error)
        }
    }

    async post<T, D = unknown>(endpoint: string, body: D): Promise<T> {
        try {
            const isFormData = body instanceof FormData
            const { data } = await axios.post<T>(
                `${this.config.apiUrl}/${endpoint}`,
                body,
                {
                    headers: this.getAuthHeaders(isFormData)
                }
            )
            return data
        } catch (error) {
            this.handleError(error)
        }
    }

    async put<T, D = unknown>(endpoint: string, body: D): Promise<T> {
        try {
            const isFormData = body instanceof FormData
            const { data } = await axios.put<T>(`${this.config.apiUrl}/${endpoint}`,
                body,
                {
                    headers: this.getAuthHeaders(isFormData)
                })
            return data
        } catch (error) {
            this.handleError(error)
        }
    }

    async delete<T, D = unknown>(endpoint: string, body?: D): Promise<T> {
        try {
            const { data } = await axios.delete<T>(
                `${this.config.apiUrl}/${endpoint}`,
                {
                    headers: this.getAuthHeaders(),
                    data: body
                }
            )
            return data
        } catch (error) {
            this.handleError(error)
        }
    }

    async patch<T, D = unknown>(endpoint: string, body: D): Promise<T> {
        try {
            const isFormData = body instanceof FormData
            const { data } = await axios.patch<T>(
                `${this.config.apiUrl}/${endpoint}`,
                body,
                {
                    headers: this.getAuthHeaders(isFormData)
                }
            )
            return data
        } catch (error) {
            this.handleError(error)
        }
    }
}

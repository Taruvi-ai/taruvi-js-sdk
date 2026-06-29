import type { TaruviConfig } from "../../types.js";
import type { TokenClient } from "../token/TokenClient.js";
import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { createErrorFromResponse, NetworkError, TaruviError } from "../errors/index.js";
import type { ErrorResponseBody } from "../errors/index.js";

/**
 * HttpClient handles all HTTP requests to the Taruvi API.
 * Sends session token via X-Session-Token header.
 * Clears tokens on session-invalidating responses (401, 410, 419).
 *
 * @internal
 */

// HTTP statuses that mean the stored session is no longer usable and the
// token must be cleared:
// - 401 Unauthorized: session token rejected
// - 410 Gone: server flushed/invalidated the session (e.g. session table cleared)
// - 419 Authentication Timeout: session expired (used by some Django/allauth setups)
// Note: 403 Forbidden is intentionally excluded — it means authenticated but
// lacking permission, so the token is still valid.
const SESSION_INVALID_STATUSES = new Set([401, 410, 419])
export class HttpClient {
    private tokenClient: TokenClient
    private axiosInstance: AxiosInstance

    constructor(config: TaruviConfig, tokenClient: TokenClient) {
        this.tokenClient = tokenClient
        this.axiosInstance = axios.create({ baseURL: config.apiUrl, withCredentials: true })
        this.setupInterceptors()
    }

    private setupInterceptors(): void {
        // Request interceptor: attach session token
        this.axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
            const isFormData = config.data instanceof FormData
            if (!isFormData) {
                config.headers['Content-Type'] = 'application/json'
            }
            const sessionToken = this.tokenClient.getSessionToken()
            if (sessionToken) {
                config.headers['X-Session-Token'] = sessionToken
            }
            return config
        })

        // Response interceptor: clear tokens when the session is no longer valid.
        // 401/410/419 all mean the stored session is dead (see SESSION_INVALID_STATUSES).
        // 403 (Forbidden) means authenticated but lacking permission — don't clear tokens.
        this.axiosInstance.interceptors.response.use(
            (response) => response,
            (error: AxiosError) => {
                const status = error.response?.status
                if (status !== undefined && SESSION_INVALID_STATUSES.has(status)) {
                    this.tokenClient.clearTokens()
                }
                return Promise.reject(error)
            }
        )
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
            throw new NetworkError(error.message)
        }

        throw error
    }

    async get<T>(endpoint: string, options?: { responseType?: 'json' | 'blob' }): Promise<T> {
        try {
            const { data } = await this.axiosInstance.get<T>(`/${endpoint}`, {
                ...(options?.responseType && { responseType: options.responseType }),
            })
            return data as T
        } catch (error) {
            this.handleError(error)
        }
    }

    async post<T, D = unknown>(endpoint: string, body: D): Promise<T> {
        try {
            const { data } = await this.axiosInstance.post<T>(`/${endpoint}`, body)
            return data
        } catch (error) {
            this.handleError(error)
        }
    }

    async put<T, D = unknown>(endpoint: string, body: D): Promise<T> {
        try {
            const { data } = await this.axiosInstance.put<T>(`/${endpoint}`, body)
            return data
        } catch (error) {
            this.handleError(error)
        }
    }

    async delete<T, D = unknown>(endpoint: string, body?: D): Promise<T> {
        try {
            const { data } = await this.axiosInstance.delete<T>(`/${endpoint}`, { data: body })
            return data
        } catch (error) {
            this.handleError(error)
        }
    }

    async patch<T, D = unknown>(endpoint: string, body: D): Promise<T> {
        try {
            const { data } = await this.axiosInstance.patch<T>(`/${endpoint}`, body)
            return data
        } catch (error) {
            this.handleError(error)
        }
    }
}

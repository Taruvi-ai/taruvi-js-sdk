import type { TaruviConfig } from "../../types.js";
import type { TokenClient } from "../token/TokenClient.js";
import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { createErrorFromResponse, NetworkError, TaruviError } from "../errors/index.js";
import type { ErrorResponseBody } from "../errors/index.js";

/**
 * HttpClient handles all HTTP requests to the Taruvi API.
 * Sends session token via X-Session-Token header.
 * Clears tokens on 401 auth failures.
 *
 * @internal
 */
export class HttpClient {
    private config: TaruviConfig
    private tokenClient: TokenClient
    private axiosInstance: AxiosInstance

    constructor(config: TaruviConfig, tokenClient: TokenClient) {
        this.config = config
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

        // Response interceptor: clear tokens on authentication failure
        // Only 401 (Unauthorized) means the session is invalid
        // 403 (Forbidden) means authenticated but lacking permission — don't clear tokens
        this.axiosInstance.interceptors.response.use(
            (response) => response,
            (error: AxiosError) => {
                const status = error.response?.status
                if (status === 401) {
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

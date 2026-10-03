import type { TaruviConfig } from "../../types.js";
import type { TokenClient } from "../token/TokenClient.js";
import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { AuthError, createErrorFromResponse, NetworkError, TaruviError } from "../errors/index.js";
import type { ErrorResponseBody } from "../errors/index.js";
import { clientIdentifier } from "../../version.js";

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

// Retry-After is either delay-seconds or an HTTP date (RFC 9110 §10.2.3).
function parseRetryAfter(value: unknown): number | undefined {
    if (typeof value !== "string" || value.trim() === "") return undefined
    const seconds = Number(value)
    if (Number.isFinite(seconds)) return Math.max(0, seconds)
    const date = Date.parse(value)
    if (Number.isNaN(date)) return undefined
    return Math.max(0, Math.ceil((date - Date.now()) / 1000))
}
export class HttpClient {
    private tokenClient: TokenClient
    private axiosInstance: AxiosInstance
    private apiKey: string | undefined

    constructor(config: TaruviConfig, tokenClient: TokenClient) {
        this.tokenClient = tokenClient
        this.apiKey = config.authMode === "apiKey" ? config.apiKey : undefined
        this.axiosInstance = axios.create({
            baseURL: config.apiUrl,
            withCredentials: true,
            headers: { "X-Taruvi-Client": clientIdentifier() },
        })
        this.setupInterceptors()
    }

    private setupInterceptors(): void {
        // Request interceptor: attach exactly one credential. Endpoints check
        // credentials in different orders, so sending two could mix identities.
        this.axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
            const isFormData = config.data instanceof FormData
            if (!isFormData) {
                config.headers['Content-Type'] = 'application/json'
            }
            if (this.apiKey) {
                config.headers['Authorization'] = `Api-Key ${this.apiKey}`
            } else {
                const sessionToken = this.tokenClient.getSessionToken()
                if (sessionToken) {
                    config.headers['X-Session-Token'] = sessionToken
                }
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
                const failedSession = error.config?.headers?.['X-Session-Token']
                if (
                    status !== undefined && SESSION_INVALID_STATUSES.has(status) &&
                    typeof failedSession === 'string' && failedSession &&
                    failedSession === this.tokenClient.getSessionToken()
                ) {
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
                const mapped = createErrorFromResponse(error.response.status, body, parseRetryAfter(error.response.headers?.["retry-after"]))
                const currentSession = this.tokenClient.getSessionToken()
                if (mapped instanceof AuthError && !this.apiKey && currentSession &&
                    error.config?.headers?.['X-Session-Token'] !== currentSession) {
                    // Tell consumers this failure belongs to an older session,
                    // without putting either credential on the public error.
                    throw new AuthError(mapped.message, mapped.detail, mapped.statusCode, true)
                }
                throw mapped
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

export interface AnalyticsRequest {
    name: string
    params?: Record<string, unknown>
}

export interface AnalyticsResponse<T = unknown> {
    data: T | null
}

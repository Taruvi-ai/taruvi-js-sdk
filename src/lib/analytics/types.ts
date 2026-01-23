export interface AnalyticsRequest {
    params?: Record<string, unknown>
}

export interface AnalyticsResponse<T = unknown> {
    data: T | null
}

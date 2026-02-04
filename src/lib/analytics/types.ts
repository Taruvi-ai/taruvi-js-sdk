import type { TaruviResponse } from "../../types.js"

export interface AnalyticsRequest {
    params?: Record<string, unknown>
}

// Response type - uses standard wrapper
export type AnalyticsResponse<T = unknown> = TaruviResponse<T>

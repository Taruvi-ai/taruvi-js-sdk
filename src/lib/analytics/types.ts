import type { TaruviResponse } from "../../types.js"

export interface AnalyticsRequest {
    params?: Record<string, unknown>
}

// Response type - the standard wrapper plus the run's execution key
export type AnalyticsResponse<T = unknown> = TaruviResponse<T> & {
    /** Identifies this run of the saved query. */
    execution_key?: string
}

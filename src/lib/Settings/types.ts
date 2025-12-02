// Internal types
export interface SettingsUrlParams {
    path?: string
}

// Request types
export interface SettingsRequest {
    [key: string]: unknown
}

// Response types
export interface SettingsResponse {
    [key: string]: unknown
}

export interface SettingsMetadataResponse {
    [key: string]: {
        type: string
        required?: boolean
        default?: unknown
        description?: string
    }
}

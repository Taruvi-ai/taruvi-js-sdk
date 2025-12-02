// Internal types
export interface SecretsUrlParams {
    path?: string
}

// Request types
export interface SecretRequest {
    value: string
}

// Response types
export interface SecretResponse {
    key: string
    value: string
    created_at?: string
    updated_at?: string
}

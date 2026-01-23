// Internal types
export interface SecretsUrlParams {
    path?: string
    queryParams?: Record<string, unknown>
}

// Request types
export interface SecretRequest {
    value: string
}

// Options for getting a single secret
export interface GetSecretOptions {
    app?: string
    tags?: string[]
}

// Options for batch getting secrets
export interface GetSecretsOptions {
    app?: string
    includeMetadata?: boolean
}

// Response types
export interface SecretResponse {
    key: string
    value: string
    tags?: string[]
    secret_type?: string
    created_at?: string
    updated_at?: string
}

// Batch get response - values only
export type SecretsBatchResponse = Record<string, string>

// Batch get response - with metadata
export type SecretsBatchMetadataResponse = Record<string, {
    value: string
    tags: string[]
    secret_type: string
}>

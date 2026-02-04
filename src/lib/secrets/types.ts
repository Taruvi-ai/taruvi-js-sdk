import type { TaruviResponse } from "../../types.js"

// Internal types
export interface SecretsUrlParams {
    path?: string
    queryParams?: Record<string, unknown>
}

// Request types - matches SiteSecretIn from backend
export interface SecretCreateRequest {
    key: string
    value: string | Record<string, unknown>
    secret_type: string
    tags?: string[]
    app?: string
}

export interface SecretUpdateRequest {
    value?: string | Record<string, unknown>
    secret_type?: string
    tags?: string[]
    app?: string
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

// Secret data
export interface SecretData {
    key: string
    value: string | Record<string, unknown>
    tags?: string[]
    secret_type?: string
    created_at?: string
    updated_at?: string
}

// Response types - uses standard wrapper
export type SecretResponse = TaruviResponse<SecretData>
export type SecretsListResponse = TaruviResponse<SecretData[]>

// Batch get response - values only
export type SecretsBatchResponse = TaruviResponse<Record<string, string>>

// Batch get response - with metadata
export type SecretsBatchMetadataResponse = TaruviResponse<Record<string, {
    value: string
    tags: string[]
    secret_type: string
}>>

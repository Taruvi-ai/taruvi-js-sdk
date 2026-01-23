// Internal types - all optional since they're built incrementally via builder pattern
export interface BucketUrlParams {
    appSlug?: string
    bucket?: string
    path?: string
    upload?: string
    delete?: string
}

export interface BucketFileUpload {
    files: []
    path: string
    metadata?: Record<string, unknown>
}

// Request types
export interface StorageRequest {
    files: File[]
    paths: string[]
    metadatas: object[]
}

export interface StorageUpdateRequest {
    metadata?: Record<string, unknown>
    visibility?: 'public' | 'private'
}

// Response types - matches StorageObjectSerializer from API
export interface StorageResponse {
    id: number
    uuid: string
    bucket?: number
    bucket_slug?: string
    bucket_name?: string
    filename: string
    file_path: string
    file_url: string
    size: number
    mimetype: string
    metadata?: Record<string, unknown>
    visibility?: string
    created_at: string
    updated_at: string
    created_by?: number
    modified_by?: number
}

// List response - matches StorageObjectListSerializer (subset of fields)
export interface StorageListResponse {
    id: string
    uuid: string
    filename: string
    file_path: string
    file_url: string
    size: number
    mimetype: string
    created_at: string
    updated_at: string
}

// Batch upload response
export interface StorageUploadBatchResponse {
    uploaded_count: number
    failed_count: number
    total: number
    message: string
    successful: Array<{
        index: number
        path: string
        object: StorageResponse
    }>
    failed: Array<{
        index: number
        path: string
        error: string
    }>
}

// Batch delete response
export interface StorageDeleteBatchResponse {
    deleted_count: number
    message: string
    failed: Array<{
        path: string
        error: string
    }>
}

// Single delete response
export interface StorageDeleteResponse {
    message: string
    success: boolean
}
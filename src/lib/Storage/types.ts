// Internal types
export interface BucketUrlParams {
    appSlug: string
    bucket: string
    path?: string | undefined
    upload: string,
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

// Response types
export interface StorageResponse {
    id: number
    uuid: string
    filename: string
    file_path: string
    file_url: string
    size: number
    mimetype: string
    metadata?: Record<string, unknown>
    visibility?: string
    created_at: string
    updated_at: string
}
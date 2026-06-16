import type { TaruviResponse } from "../../types.js"

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

// Storage object - matches StorageObjectSerializer from API
export interface StorageObject {
    id: number
    uuid: string
    bucket: number
    bucket_slug: string
    bucket_name: string
    filename: string
    file_path: string
    file_url: string
    size: number
    mimetype: string
    is_office_editable: boolean
    metadata?: Record<string, unknown>
    visibility?: 'public' | 'private' | null
    created_at: string
    updated_at: string
    created_by?: string
    modified_by?: string
}

// Response types - uses standard wrapper
export type StorageResponse = TaruviResponse<StorageObject>
export type StorageListResponse = TaruviResponse<StorageObject[]>

// Batch upload response
export interface StorageUploadBatchResponse {
    status: "success" | "error"
    message: string
    data: {
        uploaded_count: number
        failed_count: number
        total: number
        successful: Array<{
            index: number
            path: string
            object: StorageObject
        }>
        failed: Array<{
            index: number
            path: string
            error: string
        }>
    }
}

// Batch delete response
export interface StorageDeleteBatchResponse {
    status: "success" | "error"
    message: string
    data: {
        deleted_count: number
        failed: Array<{
            path: string
            error: string
        }>
    }
}
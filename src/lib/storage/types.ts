import type { TaruviResponse } from "../../types.js"

// Internal types - all optional since they're built incrementally via builder pattern
export interface BucketUrlParams {
    appSlug?: string
    bucket?: string
    path?: string
    upload?: string
    delete?: string
    browse?: string
    accessMode?: 'view' | 'edit'
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
    bucket?: number
    bucket_slug?: string
    bucket_name?: string
    filename: string
    file_path: string
    file_url: string
    size: number
    mimetype: string
    storage_provider: 's3' | 'sharepoint'
    is_office_editable: boolean
    metadata?: Record<string, unknown>
    visibility?: string
    created_at: string
    updated_at: string
    created_by?: string
    modified_by?: string
}

// SharePoint access link response
export interface StorageAccessLinkResponse {
    url: string
    mode: 'view' | 'edit'
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
        message?: string
        failed: Array<{
            path: string
            error: string
        }>
    }
}

// Browse response — virtual folder entry (no actual object on disk)
export interface StorageBrowseFolder {
    type: "folder"
    name: string
    /** Full navigable prefix, e.g. "reports/2024/" — pass back as `prefix` to browse deeper */
    path: string
}

// Browse response — file entry
export interface StorageBrowseFile {
    type: "file"
    id: number
    uuid: string
    name: string
    path: string
    size: number
    mimetype: string
    visibility: string
    is_office_editable: boolean
    created_at: string
    updated_at: string
    download_url: string | null
}

// The data payload inside the browse response
export interface StorageBrowseData {
    prefix: string
    folders: StorageBrowseFolder[]
    objects: StorageBrowseFile[]
    has_next: boolean
    page: number
    page_size: number
}

export type StorageBrowseResponse = TaruviResponse<StorageBrowseData>

// Filters accepted by the browse endpoint
export interface StorageBrowseFilters {
    /** Virtual folder prefix to list (e.g. "reports/2024/"). Defaults to root. */
    prefix?: string
    /** Page number (default 1). */
    page?: number
    /** Items per page (default 50, max 100). */
    page_size?: number
    /** Sort column: "name" | "size" | "created_at" | "updated_at" */
    sort?: 'name' | 'size' | 'created_at' | 'updated_at'
    /** Sort direction: "asc" | "desc" */
    order?: 'asc' | 'desc'
}
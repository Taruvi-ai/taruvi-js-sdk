import { MimeTypeCategory, Visibility } from './utils/enums.js'

export interface TaruviConfig {
    apiKey: string      // Identifies which site the client belongs to
    appSlug: string     // Identifies which app the client belongs to
    baseUrl: string
    deskUrl?: string    // URL for the desk/login page
    token?: string      // Optional: Pre-existing auth token
}

export interface StorageFilters {
    // Pagination (DRF style)
    page?: number
    pageSize?: number

    // Range Filters - Size (in bytes)
    size__gte?: number
    size__lte?: number
    size__gt?: number
    size__lt?: number
    min_size?: number
    max_size?: number

    // Range Filters - Dates (ISO 8601)
    created_at__gte?: string
    created_at__lte?: string
    created_after?: string
    created_before?: string
    updated_at__gte?: string
    updated_at__lte?: string

    // Search Filters
    search?: string
    filename__icontains?: string
    prefix?: string
    file?: string
    file__icontains?: string
    file__startswith?: string
    file__istartswith?: string
    metadata_search?: string

    // MIME Type Filters
    mimetype?: string
    mimetype__in?: string
    mimetype_category?: MimeTypeCategory

    // Visibility & User Filters
    visibility?: Visibility
    created_by_me?: boolean
    modified_by_me?: boolean
    created_by__username?: string
    created_by__username__icontains?: string

    // Sorting
    ordering?: string
}

export interface DatabaseFilters {
    // Pagination (DRF style)
    page?: number
    pageSize?: number

    // Sorting (DRF style: "-field" for desc, "field" for asc)
    ordering?: string

    // Dynamic filters - allows any field with operators
    [key: string]: string | number | boolean | undefined
}

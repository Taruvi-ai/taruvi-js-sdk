import { MimeTypeCategory, Visibility } from './utils/enums.js'

export type AuthMode = "browser" | "apiKey"

export interface TaruviConfig {
    /** Required when authMode is "apiKey" (default outside the browser) */
    apiKey?: string
    appSlug: string     // Identifies which app the client belongs to
    apiUrl: string      // Base API URL
    deskUrl?: string    // URL for the desk/login page
    /**
     * Optional pre-seeded JWT access token.
     * Supported in both browser and server environments.
     * When provided, overrides any access token already stored in browser localStorage.
     */
    token?: string

    /**
     * Authentication mode.
     * Defaults to "browser" when `window` exists, otherwise "apiKey".
     */
    authMode?: AuthMode
}

// Standard response wrapper matching backend AppDataResponse
export interface TaruviResponse<T = unknown> {
    status: "success" | "error"
    message: string
    data: T
    total?: number
    pagination?: PaginationInfo
}

export interface PaginationInfo {
    offset: number
    limit: number
    count: number
    current_page: number
    total_pages: number
    has_next: boolean
    has_previous: boolean
}

export interface StorageFilters {
    // Pagination (DRF style)
    page?: number
    page_size?: number

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
    page_size?: number

    // Sorting (DRF style: "-field" for desc, "field" for asc)
    ordering?: string

    // Populate relations
    populate?: string

    // Search (translates to search_vector__search on backend)
    search?: string

    // Aggregates
    _aggregate?: string
    _group_by?: string
    _having?: string

    /**
     * JSON filter tree for the `filters` query param (set via `Database.filters(tree)`).
     * Do not use the flat `filters(field, …)` triple overload with `field === 'filters'`.
     */
    filters?: string

    // Dynamic filters - allows any field with operators
    [key: string]: string | number | boolean | undefined
}

import { MimeTypeCategory, Visibility } from './utils/enums.js'

/**
 * How requests authenticate.
 * - `"session"` (default): the signed-in user's session, from hosted sign-in or `token`.
 * - `"apiKey"`: an API key, for server code only. Requests act as the key's creator.
 */
export type AuthMode = "session" | "apiKey"

export interface TaruviConfig {
    /** Site address, `TARUVI_SITE_URL`. */
    apiUrl: string
    /** App slug, `TARUVI_APP_SLUG`. */
    appSlug: string
    /** Defaults to `"session"`. */
    authMode?: AuthMode
    /** API key, sent only with `authMode: "apiKey"`. Never ship one to a browser or mobile app. */
    apiKey?: string
    /** Explicit session token, held in memory for this client in every runtime. Without it, browsers use the shared sign-in session. */
    token?: string
    /** Host of the hosted sign-in pages. Defaults to `apiUrl`. */
    deskUrl?: string
    /**
     * Capture `#session_token` from the address when the client is created. Defaults to `true`.
     * Set it to `false` and call `Auth.handleRedirect()` yourself, for example in a
     * Next.js client component effect.
     */
    detectSessionInUrl?: boolean
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

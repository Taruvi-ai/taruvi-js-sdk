import type { Client } from "../../client.js"
import { HttpMethod } from "../../lib-internal/http/types.js"
import type { TaruviResponse } from "../../types.js"

export type DatabaseOperation = HttpMethod

// Filter operators matching Python SDK
export type FilterOperator =
    | 'eq'           // Equal
    | 'ne'           // Not equal
    | 'gt'           // Greater than
    | 'gte'          // Greater than or equal
    | 'lt'           // Less than
    | 'lte'          // Less than or equal
    | 'in'           // In array
    | 'nin'          // Not in array
    | 'contains'     // String contains (case-sensitive)
    | 'icontains'    // String contains (case-insensitive)
    | 'startswith'   // String starts with (case-sensitive)
    | 'istartswith'  // String starts with (case-insensitive)
    | 'endswith'     // String ends with (case-sensitive)
    | 'iendswith'    // String ends with (case-insensitive)
    | 'isnull'       // Is null

export type SortOrder = 'asc' | 'desc'

// Internal types
export interface UrlParams {
    appSlug?: string
    dataTables?: string
    recordId?: string
}

export interface DatabaseClientInterface {
    client: Client
    urlParams?: UrlParams
}

// Request types
export interface DatabaseRequest {
    [key: string]: unknown
}

// Response types - uses standard wrapper
export type DatabaseResponse<T = unknown> = TaruviResponse<T[]>
export type DatabaseSingleResponse<T = unknown> = TaruviResponse<T>
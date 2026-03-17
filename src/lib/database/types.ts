import type { Client } from "../../client.js"
import { HttpMethod } from "../../lib-internal/http/types.js"
import type { TaruviResponse } from "../../types.js"

export type DatabaseOperation = HttpMethod

// Filter operators matching backend FilterParams.OPERATORS (32 operators)
export type FilterOperator =
    // Comparison
    | 'eq'           // Equal
    | 'ne'           // Not equal
    | 'gt'           // Greater than
    | 'gte'          // Greater than or equal
    | 'lt'           // Less than
    | 'lte'          // Less than or equal
    // IN operators
    | 'in'           // In array
    | 'nin'          // Not in array
    | 'ina'          // In array (case-insensitive)
    | 'nina'         // Not in array (case-insensitive)
    // String contains
    | 'contains'     // Contains (case-sensitive)
    | 'ncontains'    // Not contains (case-sensitive)
    | 'containss'    // Contains (case-sensitive, strict)
    | 'ncontainss'   // Not contains (case-sensitive, strict)
    | 'icontains'    // Contains (case-insensitive)
    | 'nicontains'   // Not contains (case-insensitive)
    // Starts with
    | 'startswith'   // Starts with (case-sensitive)
    | 'nstartswith'  // Not starts with (case-sensitive)
    | 'startswiths'  // Starts with (case-sensitive, strict)
    | 'nstartswiths' // Not starts with (case-sensitive, strict)
    // Ends with
    | 'endswith'     // Ends with (case-sensitive)
    | 'nendswith'    // Not ends with (case-sensitive)
    | 'endswiths'    // Ends with (case-sensitive, strict)
    | 'nendswiths'   // Not ends with (case-sensitive, strict)
    // Range
    | 'between'      // Between two values
    | 'nbetween'     // Not between two values
    // Null checks
    | 'null'         // Is null
    | 'nnull'        // Is not null

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
import type { Client } from "../../client.js"
import { HttpMethod } from "../../lib-internal/http/types.js"
import type { TaruviResponse } from "../../types.js"
import type { SortOrder, GraphInclude } from "../../utils/enums.js"

export type { SortOrder, GraphInclude }
export type { DataFormat } from "../../utils/enums.js"

export type DatabaseOperation = HttpMethod

// Filter operators matching backend FilterParams.OPERATORS
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
    // String contains (backend: plain contains uses ILIKE; *s suffix = case-sensitive LIKE)
    | 'contains'     // Contains (case-insensitive, ILIKE)
    | 'ncontains'    // Not contains (case-insensitive)
    | 'containss'    // Contains (case-sensitive LIKE)
    | 'ncontainss'   // Not contains (case-sensitive LIKE)
    | 'icontains'    // Alias → contains (case-insensitive)
    | 'nicontains'   // Alias → ncontains
    // Starts with
    | 'startswith'   // Starts with (case-insensitive)
    | 'nstartswith'  // Not starts with (case-insensitive)
    | 'startswiths'  // Starts with (case-sensitive LIKE)
    | 'nstartswiths' // Not starts with (case-sensitive LIKE)
    // Ends with
    | 'endswith'     // Ends with (case-insensitive)
    | 'nendswith'    // Not ends with (case-insensitive)
    | 'endswiths'    // Ends with (case-sensitive LIKE)
    | 'nendswiths'   // Not ends with (case-sensitive LIKE)
    // Range
    | 'between'      // Between two values
    | 'nbetween'     // Not between two values
    // Null checks
    | 'null'         // Is null
    | 'nnull'        // Is not null
    // Search / pattern
    | 'search'       // Full-text search
    | 'like'         // SQL LIKE pattern
    | 'ilike'        // Case-insensitive LIKE
    // Array containment (PostgreSQL)
    | 'acontains'      // Array contains all items (column @> ARRAY[values])
    | 'nacontains'     // NOT array contains
    | 'acontainedby'   // Array contained by (column <@ ARRAY[values])
    | 'nacontainedby'  // NOT array contained by
    | 'aoverlap'       // Arrays have overlap (column && ARRAY[values])
    | 'naoverlap'      // No overlap
    | 'aelement'       // Value exists in array (value = ANY(column))
    | 'naelement'      // Value not in array (value != ALL(column))
    // PostgreSQL range type operators
    | 'rcontains'      // Range column @> value or [lower, upper]
    | 'rcontainedby'   // Range column <@ [lower, upper]
    | 'roverlaps'      // Range column && [lower, upper]
    | 'radjacent'      // Range column -|- [lower, upper]
    | 'rstrictleft'    // Range column << [lower, upper]
    | 'rstrictright'   // Range column >> [lower, upper]

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

// Graph traversal types
export type GraphFormat = 'flat' | 'tree' | 'graph'

// Edge types
export interface EdgeRequest {
    from_id: number | string
    to_id: number | string
    type: string
    metadata?: Record<string, unknown>
}

export interface EdgeResponse {
    id: number
    from_id: number | string
    to_id: number | string
    type: string
    metadata?: Record<string, unknown>
}

export interface EdgeDeleteRequest {
    edge_ids: number[]
}

export interface PgRangeValue {
    lower: string | number | null
    upper: string | number | null
    bounds: '()' | '(]' | '[)' | '[]'
    empty: boolean
}

/**
 * Leaf node for the backend `filters` JSON query param.
 * Leaf `operator` strings are platform tokens (see taruvi-platform `FIELD_OPERATORS` /
 * `filter_translator`). `contains` = case-insensitive substring; `containss` = case-sensitive.
 */
export interface BackendFilterLeafNode {
    field: string
    operator: string
    value: unknown
}

/** Logical `and` / `or` group for the backend `filters` JSON query param. */
export interface BackendFilterLogicalNode {
    operator: 'and' | 'or'
    value: BackendFilterNode[]
}

export type BackendFilterNode = BackendFilterLogicalNode | BackendFilterLeafNode

/** Top level of the `filters` JSON payload: an array of logical nodes. */
export type BackendFilterTreeRoot = BackendFilterLogicalNode[]

function isPlainObject(x: unknown): x is Record<string, unknown> {
    return typeof x === 'object' && x !== null && !Array.isArray(x)
}

function isBackendFilterLogicalNode(x: unknown): x is BackendFilterLogicalNode {
    if (!isPlainObject(x)) return false
    if (x.operator !== 'and' && x.operator !== 'or') return false
    if (!Array.isArray(x.value)) return false
    if ('field' in x) return false
    return true
}

/** Runtime check for the single-arg `filters(tree)` overload. */
export function isBackendFilterTreeRoot(x: unknown): x is BackendFilterTreeRoot {
    return Array.isArray(x) && x.every(isBackendFilterLogicalNode)
}
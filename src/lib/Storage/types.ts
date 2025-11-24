import type { Client } from "../../client.js"
import { HttpMethod } from "../../lib-internal/http/types.js"

export type StorageOperation = HttpMethod

/**
 * Filter operators supported by Taruvi Data Service
 * Based on Refine.dev compatible operators
 */
export type FilterOperator =
    | 'eq'           // Equal (default)
    | 'ne'           // Not equal
    | 'lt'           // Less than
    | 'lte'          // Less than or equal
    | 'gt'           // Greater than
    | 'gte'          // Greater than or equal
    | 'contains'     // String contains
    | 'ncontains'    // String does not contain
    | 'startswith'   // String starts with
    | 'endswith'     // String ends with
    | 'in'           // Value in array
    | 'nin'          // Value not in array
    | 'null'         // Is null
    | 'nnull'        // Is not null
    | 'between'      // Between two values

export type SortOrder = 'ASC' | 'DESC' | 'asc' | 'desc'

export interface FilterCondition {
    field: string
    operator: FilterOperator
    value: any
}

export interface SortCondition {
    field: string
    order: SortOrder
}

export interface PaginationParams {
    _start?: number
    _end?: number
    limit?: number
    offset?: number
}

export interface QueryParams extends PaginationParams {
    _sort?: string
    _order?: string
    populate?: string
    [key: string]: any  // For dynamic filter fields
}

export interface StorageUrlParams {
    appSlug?: string
    tableName?: string
    recordId?: string
}

export interface StorageResponse<T = any> {
    data: T[]
    total: number
    meta: {
        offset: number
        count: number
        has_more: boolean
    }
}

export interface SingleRecordResponse<T = any> {
    data: T
}

export interface CreateResponse<T = any> {
    data: T | T[]
    created_count?: number
}

export interface UpdateResponse<T = any> {
    data: T
}

export interface DeleteResponse {
    success: boolean
    deleted_count?: number
}

export interface StorageClientInterface {
    client: Client
    urlParams?: StorageUrlParams
}

/**
 * Frictionless Table Schema field types
 */
export type FieldType =
    | 'string'
    | 'integer'
    | 'number'
    | 'boolean'
    | 'date'
    | 'datetime'
    | 'time'
    | 'object'
    | 'array'

export interface FieldConstraints {
    required?: boolean
    unique?: boolean
    minimum?: number
    maximum?: number
    minLength?: number
    maxLength?: number
    pattern?: string
    enum?: any[]
}

export interface SchemaField {
    name: string
    type: FieldType
    constraints?: FieldConstraints
    description?: string
}

export interface ForeignKey {
    fields: string[]
    reference: {
        resource: string
        fields: string[]
    }
}

export interface TableSchema {
    fields: SchemaField[]
    primaryKey?: string[]
    foreignKeys?: ForeignKey[]
}

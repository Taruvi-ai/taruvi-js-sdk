import type { Client } from "../../client.js"
import { HttpMethod } from "../../lib-internal/http/types.js"

export type DatabaseOperation = HttpMethod

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

// Response types
export interface DatabaseResponse<T = unknown> {
    id?: string | number
    created_at?: string
    updated_at?: string
    [key: string]: T | string | number | undefined
}
import type { Client } from "../../client.js"
import { HttpMethod } from "../../lib-internal/http/types.js"

export type AppOperation = HttpMethod

// Internal types
export interface UrlParams {
    appSlug?: string
    roles?: string
}

export interface AppClientInterface {
    client: Client
    urlParams?: UrlParams
}

// Response types
export interface RoleResponse {
    id?: string | number
    name?: string
    permissions?: string[]
    created_at?: string
    updated_at?: string
    [key: string]: unknown
}

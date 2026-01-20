import type { Client } from "../../client.js"
import { HttpMethod } from "../../lib-internal/http/types.js"

export type AppOperation = HttpMethod

// Internal types
export interface UrlParams {
    appSlug?: string
    roles?: string
    settings?: string
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

export interface SettingsResponse {
    display_name: string
    icon: string | null
    icon_url: string | null
    primary_color: string
    secondary_color: string
    banner_image: string | null
    banner_image_url: string | null
    category: string
    documentation_url: string | null
    support_email: string | null
    default_frontend_worker_url: string | null
    created_at: string
    updated_at: string
}

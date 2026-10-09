import type { Client } from "../../client.js"
import { HttpMethod } from "../../lib-internal/http/types.js"
import type { TaruviResponse } from "../../types.js"

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

// Role data
export interface RoleData {
    id: string | number
    name: string
    slug: string
    description?: string
    permissions?: string[]
    created_at?: string
    updated_at?: string
}

// App settings data
export interface AppSettingsData {
    display_name: string
    icon: string | null
    icon_url: string | null
    primary_color: string
    secondary_color: string
    icon_background_color: string
    category: string
    documentation_url: string | null
    support_email: string | null
    default_frontend_worker_url: string | null
    default_frontend_worker_slug: string | null
    created_at: string
    updated_at: string
}

// Response types - uses standard wrapper
export type RoleResponse = TaruviResponse<RoleData>
export type RolesListResponse = TaruviResponse<RoleData[]>
export type AppSettingsResponse = TaruviResponse<AppSettingsData>

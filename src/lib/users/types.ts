import type { TaruviResponse } from "../../types.js"

export interface UserCreateRequest {
    username: string
    email: string
    password: string
    confirm_password: string
    first_name: string
    last_name: string
    is_active?: boolean
    is_staff?: boolean
    is_cloud_user?: boolean
    attributes?: Record<string, unknown>
    role_slugs?: string[]
}

export interface UserData {
    id: number
    uuid?: string
    username: string
    email: string
    first_name: string
    last_name: string
    full_name?: string
    is_active: boolean
    is_staff: boolean
    is_superuser?: boolean
    is_deleted: boolean
    date_joined: string
    last_login?: string
    groups?: UserGroup[]
    user_permissions?: UserPermission[]
    attributes?: Record<string, unknown>
    missing_attributes?: string[]
    roles?: UserRole[]
}

export interface UserGroup {
    id: number
    name: string
}

export interface UserPermission {
    id: number
    name: string
    codename: string
    content_type: string
}

export interface UserRole {
    name: string
    slug: string
    type: string
    app_slug: string
    source: "direct" | "site_role" | "inherited"
}

export interface UserUpdateRequest {
    username?: string
    email?: string
    first_name?: string
    last_name?: string
    is_active?: boolean
    is_staff?: boolean
}

export interface UserListFilters {
    search?: string
    is_active?: boolean
    is_staff?: boolean
    is_superuser?: boolean
    is_deleted?: boolean
    ordering?: string
    page?: number
    page_size?: number
}

export interface UserApp {
    name: string
    slug: string
    icon: string
    url: string
    display_name: string
}

// Response types - uses standard wrapper
export type UserResponse = TaruviResponse<UserData>
export type UserListResponse = TaruviResponse<UserData[]>
export type UserAppsResponse = TaruviResponse<UserApp[]>

export interface UserPreferences {
    date_format: string
    time_format: string
    timezone: string
    theme: string
    widget_config: Record<string, unknown>
}

export interface UserPreferencesUpdate {
    date_format?: string
    time_format?: string
    timezone?: string
    theme?: string
    widget_config?: Record<string, unknown>
}

export type UserPreferencesResponse = TaruviResponse<UserPreferences>

export interface AssignRolesRequest {
    roles: string[]
    usernames: string[]
    expires_at?: string
}

export interface RevokeRolesRequest {
    roles: string[]
    usernames: string[]
}

export type RolesResponse = TaruviResponse<{
    count: number
}>
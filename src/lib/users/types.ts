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
    attributes?: Record<string, unknown>
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
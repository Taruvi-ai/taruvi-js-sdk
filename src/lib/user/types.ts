export interface UserCreateRequest {
    // Required fields
    username: string
    email: string
    first_name: string
    last_name: string
    password: string
    confirm_password: string
    // Optional fields
    is_active?: boolean
    is_staff?: boolean
    attributes?: string
}

export interface UserCreateResponse {
    id: number
    uuid: string
    username: string
    email: string
    first_name: string
    last_name: string
    is_active: boolean
    is_staff: boolean
    is_superuser: boolean
    is_deleted: boolean
    date_joined: string
}

export interface UserGroup {
    id: number
    name: string
}

export interface UserPermission {
    id: number
    name: string
    codename: string
    content_type: string // "app_label.model"
}

export interface UserRole {
    name: string
    slug: string
    type: "app_role"
    app_slug: string
    source: "direct" | "site_role" | "inherited"
}

export interface UserDataResponse {
    id: number
    username: string
    email: string
    first_name: string
    last_name: string
    full_name: string
    is_active: boolean
    is_staff: boolean
    is_superuser: boolean
    is_deleted: boolean
    date_joined: string // ISO 8601 date-time string
    last_login: string // ISO 8601 date-time string
    groups: UserGroup[]
    user_permissions: UserPermission[]
    attributes: Record<string, unknown>
    missing_attributes: string[]
    roles: UserRole[]
}

export interface UserUpdateRequest {
    username?: string
    email?: string
    first_name?: string
    last_name?: string
    is_active?: boolean
    is_staff?: boolean
}

export interface UserUpdateResponse {
    id: number
    uuid: string
    username: string
    email: string
    first_name: string
    last_name: string
    is_active: boolean
    is_staff: boolean
    is_superuser: boolean
    is_deleted: boolean
    date_joined: string
}

export interface UserList {
    search: string
    is_active: boolean
    is_staff: boolean
    is_superuser: boolean
    is_deleted: boolean
    ordering: string
    page: Number
    page_size: Number
}

export interface UserApp {
    name: string
    slug: string
    icon: string
    url: string
    display_name: string
}

export type UserAppsResponse = UserApp[]
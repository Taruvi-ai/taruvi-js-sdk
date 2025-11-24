export interface UserCreateRequest {
    username: string,
    email: string,
    password: string,
    confirm_password: string,
    first_name: string,
    last_name: string,
    is_active: boolean,
    is_staff: boolean,
    attributes: string
}

export interface UserCreateResponse {
    username: string,
    email: string,
    first_name: string,
    last_name: string,
    is_active: boolean,
    is_staff: boolean,
    attributes: string
}

export interface UserDataResponse {
    id: number,
    username: string,
    email: string,
    first_name: string,
    last_name: string,
    full_name: string,
    is_active: boolean,
    is_staff: boolean,
    is_deleted: boolean,
    date_joined: string, // ISO 8601 date-time string
    last_login: string, // ISO 8601 date-time string
    attributes: string
}

export interface UserUpdateRequest {
    username?: string,
    email?: string,
    password?: string,
    confirm_password?: string,
    first_name?: string,
    last_name?: string,
    is_active?: boolean,
    is_staff?: boolean,
    attributes?: string
}

export interface UserUpdateResponse {
    username: string,
    email: string,
    first_name: string,
    last_name: string,
    is_active: boolean,
    is_staff: boolean,
    attributes: string
}
import type { Client } from "../../client.js";
import type { UserCreateRequest, UserResponse, UserListResponse, UserListFilters, UserUpdateRequest, UserAppsResponse, AssignRolesRequest, RevokeRolesRequest, RolesResponse } from "./types.js";
import { UserRoutes } from "../../lib-internal/routes/UserRoutes.js";
import { buildQueryString } from "../../utils/utils.js";


export class User {
    private client: Client

    constructor(client: Client) {
        this.client = client
    }

    async updateUser(username: string, body: UserUpdateRequest): Promise<UserResponse> {
        return await this.client.httpClient.put(UserRoutes.updateUser(username), body)
    }

    async getUser(username: string): Promise<UserResponse> {
        return await this.client.httpClient.get<UserResponse>(UserRoutes.getUser(username))
    }

    async list(filters?: UserListFilters): Promise<UserListResponse> {
        const queryString = buildQueryString(filters as unknown as Record<string, unknown>)
        return await this.client.httpClient.get<UserListResponse>(UserRoutes.listUser(queryString))
    }

    async getUserApps(username: string): Promise<UserAppsResponse> {
        return await this.client.httpClient.get<UserAppsResponse>(UserRoutes.getUserApps(username))
    }

    async createUser(userData: UserCreateRequest): Promise<UserResponse> {
        return await this.client.httpClient.post<UserResponse, UserCreateRequest>(
            UserRoutes.baseUrl,
            userData
        )
    }

    async deleteUser(username: string): Promise<void> {
        return await this.client.httpClient.delete(UserRoutes.deleteUser(username))
    }

    async assignRoles(request: AssignRolesRequest): Promise<RolesResponse> {
        return await this.client.httpClient.post<RolesResponse, AssignRolesRequest>(
            UserRoutes.assignRoles(),
            request
        )
    }

    async revokeRoles(request: RevokeRolesRequest): Promise<RolesResponse> {
        return await this.client.httpClient.delete<RolesResponse>(
            UserRoutes.revokeRoles(),
            request
        )
    }
}
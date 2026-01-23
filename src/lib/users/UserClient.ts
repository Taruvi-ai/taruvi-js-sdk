import type { Client } from "../../client.js";
import type { UserCreateRequest, UserCreateResponse, UserDataResponse, UserList, UserUpdateRequest, UserAppsResponse, AssignRolesRequest, RevokeRolesRequest, RolesResponse } from "./types.js";
import { UserRoutes } from "../../lib-internal/routes/UserRoutes.js";
import { buildQueryString } from "../../utils/utils.js";


export class User {
    private client: Client

    constructor(client: Client) {
        this.client = client
    }

    // - updateUser
    async updateUser(username: string, body: UserUpdateRequest): Promise<UserCreateResponse> {
        return await this.client.httpClient.put(UserRoutes.updateUser(username), body)
    }

    async getUser(username: string): Promise<UserDataResponse> {
        return await this.client.httpClient.get<UserDataResponse>(UserRoutes.getUser(username))
    }

    async list(filters: UserList) {
        const queryString = buildQueryString(filters as unknown as Record<string, unknown>)
        return await this.client.httpClient.get(UserRoutes.listUser(queryString))
    }

    async getUserApps(username: string): Promise<UserAppsResponse> {
        return await this.client.httpClient.get<UserAppsResponse>(UserRoutes.getUserApps(username))
    }

    // - createUser
    async createUser(userData: UserCreateRequest): Promise<UserCreateResponse> {
        return await this.client.httpClient.post<UserCreateResponse, UserCreateRequest>(
            UserRoutes.baseUrl,
            userData
        )
    }

    // - deleteUser
    async deleteUser(username: string): Promise<void> {
        return await this.client.httpClient.delete(UserRoutes.deleteUser(username))
    }

    // - assignRoles
    async assignRoles(request: AssignRolesRequest): Promise<RolesResponse> {
        return await this.client.httpClient.post<RolesResponse, AssignRolesRequest>(
            UserRoutes.assignRoles(),
            request
        )
    }

    // - revokeRoles
    async revokeRoles(request: RevokeRolesRequest): Promise<RolesResponse> {
        return await this.client.httpClient.delete<RolesResponse>(
            UserRoutes.revokeRoles(),
            request
        )
    }
}
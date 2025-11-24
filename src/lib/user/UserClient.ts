import type { Client } from "../../client.js";
import type { UserCreateRequest, UserCreateResponse, UserDataResponse, UserUpdateRequest } from "./types.js";
import { UserRoutes } from "../../lib-internal/routes/UserRoutes.js";


export class User {
    private client: Client

    constructor(client: Client) {
        this.client = client
    }
    
    // - getUser (fetch user details from API)
    // - getUserProfile
    async getUserData(): Promise<UserDataResponse> {
        return this.client.httpClient.get<UserDataResponse>(UserRoutes.getCurrentUser)
    }

    // - updateUser
    async updateUser(username: string, body: UserUpdateRequest): Promise<UserCreateResponse> {
        return this.client.httpClient.put(UserRoutes.updateUser(username), body)
    }

    // - createUser
    async createUser(userData: UserCreateRequest): Promise<UserCreateResponse> {
        return this.client.httpClient.post<UserCreateResponse, UserCreateRequest>(
            UserRoutes.createNewUser,
            userData
        )
    }

    // - deleteUser
    async deleteUser(username: string): Promise<void> {
        await this.client.httpClient.delete(UserRoutes.deleteUser(username))
    }

    // - deleteUser
    // TODO: Implement user management methods
    // - token getter (access JWT token)
}
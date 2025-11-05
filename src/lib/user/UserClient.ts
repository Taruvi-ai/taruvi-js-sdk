import type { Client } from "../../client.js";

export class User {
    private client: Client

    constructor(client: Client) {
        this.client = client
    }

    // TODO: Implement user management methods
    // - getUser (fetch user details from API)
    // - updateUser
    // - deleteUser
    // - getUserProfile
    // - token getter (access JWT token)
}
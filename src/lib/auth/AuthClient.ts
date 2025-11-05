import type { Client } from "../../client.js";

// handles user auth not dev auth
export class Auth {
    private client: Client

    constructor(client: Client) {
        this.client = client
    }

    // TODO: Implement authentication methods
    // - signInWithSSO
    // - signInWithPassword ?
    // - signOut
    // - isUserAuthenticated
    // - refreshSession
    // - redirectToLogin
}
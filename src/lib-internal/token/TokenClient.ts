export class TokenClient {
    private token: string | null = null

    constructor(token?: string) {
        if (token) {
            this.token = token
        }
    }

    // TODO: Implement token management
    // - setToken
    // - getToken
    // - refreshToken
    // - clearToken
    // - isTokenExpired
}

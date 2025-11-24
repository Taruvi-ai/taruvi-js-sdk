import { getRuntimeEnvironment } from "../../utils/utils.js"

export class TokenClient {
    // private tenantAdminToken: string | null = null
    private runTimeEnvironment: string
    private browserRunTime: boolean
    // private adminSessionToken: string | null

    constructor(token?: string) {
        this.runTimeEnvironment = getRuntimeEnvironment()
        this.browserRunTime = this.runTimeEnvironment == "Browser"
        // this.adminSessionToken = this.getToken()
    }

    getToken(): string | null {
        if (this.browserRunTime) {
            // return localStorage.getItem("")
            return localStorage.getItem("sessionid")
        }
        return null
        // return this.tenantAdminToken
    }

    // TODO: Implement token management
    // - setToken
    // - getToken
    // - refreshToken
    // - clearToken
    // - isTokenExpired
}

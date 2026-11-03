import type { Client } from "../../client.js";
import type { TaruviResponse } from "../../types.js";
import type { UserData } from "../users/types.js";
import { AuthRoutes } from "../../lib-internal/routes/AuthRoutes.js";
import { UserRoutes } from "../../lib-internal/routes/UserRoutes.js";
import { captureSessionFromUrl } from "../../lib-internal/token/redirect.js";
import { AuthError, ConflictError, ErrorCode, ForbiddenError, RateLimitError, TaruviError } from "../../lib-internal/errors/index.js";

/** Outcome of a headless (stateless) auth call. */
export type HeadlessAuthResult =
    | { status: "authenticated" }
    | { status: "mfa_required"; types: string[] }
    | { status: "unauthenticated" }

export interface PasswordLoginParams {
    email?: string
    username?: string
    password: string
}

export interface PasswordSignupParams {
    email: string
    password: string
    username?: string
    firstName?: string
    lastName?: string
    /** Site user attributes (sent as flat fields, as the backend signup form expects). */
    attributes?: Record<string, unknown>
}

interface HeadlessFlow {
    id: string
    is_pending?: boolean
    types?: string[]
}

interface HeadlessBody {
    status?: number
    data?: { flows?: HeadlessFlow[] }
    meta?: { is_authenticated?: boolean; session_token?: string }
    errors?: { message: string; code?: string; param?: string }[]
}

/** Convert an allauth headless error body into an SDK error. */
function headlessError(status: number, body: HeadlessBody | undefined): TaruviError {
    const first = body?.errors?.[0]
    const message = first?.message || `Request failed with status ${status}`
    if (status === 401) return new AuthError(message)
    if (status === 403) return new ForbiddenError(message)
    if (status === 409) return new ConflictError(message)
    if (status === 429) return new RateLimitError(message)
    const errors: Record<string, string[]> = {}
    for (const e of body?.errors ?? []) {
        const key = e.param || "non_field_errors"
        errors[key] = [...(errors[key] ?? []), e.message]
    }
    const code = status === 400 ? ErrorCode.VALIDATION_ERROR : ErrorCode.INTERNAL_ERROR
    return new TaruviError(message, status, code, undefined, errors)
}

/**
 * Auth Client - Handles user authentication using Web UI Flow
 * Uses session token for API authentication via X-Session-Token header.
 * On a session-invalidating response (401/410/419), tokens are cleared automatically by the
 * HttpClient interceptor (403 does not clear the token — it means authenticated but unauthorized).
 */
export class Auth {
    private client: Client
    // Token of a login waiting for its 2FA code. Kept out of the token store so
    // session checks (hasToken/check) don't run with it, get a 401 and wipe it.
    private pendingToken: string | null = null

    constructor(client: Client) {
        this.client = client
    }

    /**
     * Redirect to login page (Web UI Flow)
     */
    login(callbackUrl?: string): void {
        if (typeof window === "undefined" || !window.location) {
            console.error("login() can only be called in browser environment")
            return
        }

        const config = this.client.getConfig()
        const callback = callbackUrl || window.location.origin + window.location.pathname
        const deskUrl = config.deskUrl || config.apiUrl
        const loginUrl = `${deskUrl}/accounts/login/?redirect_to=${encodeURIComponent(callback)}`

        if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem("auth_state", JSON.stringify({
                returnTo: window.location.pathname,
                timestamp: Date.now()
            }))
        }

        window.location.href = loginUrl
    }

    /**
     * Redirect to signup page (Web UI Flow)
     */
    signup(callbackUrl?: string): void {
        if (typeof window === "undefined" || !window.location) {
            console.error("signup() can only be called in browser environment")
            return
        }

        const config = this.client.getConfig()
        const callback = callbackUrl || window.location.origin + window.location.pathname
        const deskUrl = config.deskUrl || config.apiUrl
        const signupUrl = `${deskUrl}/accounts/signup/?redirect_to=${encodeURIComponent(callback)}`

        if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem("auth_state", JSON.stringify({
                returnTo: window.location.pathname,
                timestamp: Date.now()
            }))
        }

        window.location.href = signupUrl
    }

    /**
     * Logout user and redirect to logout page
     */
    async logout(callbackUrl?: string): Promise<void> {
        // Forget the session in every runtime; only a browser can be redirected.
        this.client.tokenClient.clearTokens()

        if (typeof window === "undefined" || !window.location) {
            return
        }

        const config = this.client.getConfig()
        const deskUrl = config.deskUrl || config.apiUrl
        // The platform exposes no per-app frontend URL, so default to this app's origin.
        const callback = callbackUrl || window.location.origin

        const logoutUrl = `${deskUrl}/accounts/logout/?redirect_to=${encodeURIComponent(callback)}`
        window.location.href = logoutUrl
    }

    // ------------------------------------------------------------------
    // Headless (stateless) flow: JSON calls to allauth's app client.
    // The SPA renders its own forms; the session token is stored locally.
    // ------------------------------------------------------------------

    private storeSessionToken(body: HeadlessBody | undefined): void {
        const token = body?.meta?.session_token
        if (token) this.client.tokenClient.setTokens({ sessionToken: token })
    }

    /** Map a headless auth response (200 / 401) to a result, storing any session token. */
    private toResult(status: number, body: HeadlessBody | undefined): HeadlessAuthResult {
        if (status === 200 && body?.meta?.is_authenticated) {
            this.pendingToken = null
            this.storeSessionToken(body)
            return { status: "authenticated" }
        }
        if (status === 401) {
            const mfa = body?.data?.flows?.find((f) => f.id === "mfa_authenticate" && f.is_pending)
            if (mfa) {
                // The 2FA call must be made with this token.
                this.pendingToken = body?.meta?.session_token ?? null
                return { status: "mfa_required", types: mfa.types ?? [] }
            }
            this.pendingToken = null
            this.client.tokenClient.clearTokens()
            return { status: "unauthenticated" }
        }
        throw headlessError(status, body)
    }

    /**
     * Log in with email/username + password.
     * Resolves to `authenticated`, or `mfa_required` (then call `mfaAuthenticate(code)`).
     * Throws a ValidationError (400) for wrong credentials.
     */
    async loginWithPassword(params: PasswordLoginParams): Promise<HeadlessAuthResult> {
        // A stale token would make allauth answer 409 (already logged in).
        this.client.tokenClient.clearTokens()
        const body: Record<string, string> = { password: params.password }
        if (params.email) body.email = params.email
        else if (params.username) body.username = params.username
        const { status, data } = await this.client.httpClient.send<HeadlessBody>("post", AuthRoutes.login(), body)
        const result = this.toResult(status, data)
        if (result.status === "unauthenticated") throw new AuthError("Login failed")
        return result
    }

    /** Complete a pending 2FA login with a TOTP or recovery code. */
    async mfaAuthenticate(code: string): Promise<HeadlessAuthResult> {
        const headers = this.pendingToken ? { "X-Session-Token": this.pendingToken } : undefined
        const { status, data } = await this.client.httpClient.send<HeadlessBody>("post", AuthRoutes.mfaAuthenticate(), { code }, headers)
        return this.toResult(status, data)
    }

    /** Create an account (site self-signup must be enabled) and log in. */
    async signupWithPassword(params: PasswordSignupParams): Promise<HeadlessAuthResult> {
        this.client.tokenClient.clearTokens()
        const body: Record<string, unknown> = { ...(params.attributes ?? {}), email: params.email, password: params.password }
        if (params.username) body.username = params.username
        if (params.firstName) body.first_name = params.firstName
        if (params.lastName) body.last_name = params.lastName
        const { status, data } = await this.client.httpClient.send<HeadlessBody>("post", AuthRoutes.signup(), body)
        return this.toResult(status, data)
    }

    /**
     * Email a password-reset link. `resetUrl` is the SPA page that receives `?key=...`;
     * it must be on the site's allowlist, otherwise the email links to the site's
     * hosted reset page. Always resolves for unknown emails (no account enumeration).
     */
    async requestPasswordReset(email: string, resetUrl?: string): Promise<void> {
        const body: Record<string, string> = { email }
        if (resetUrl) body.reset_url = resetUrl
        const { status, data } = await this.client.httpClient.send<HeadlessBody>("post", AuthRoutes.passwordRequest(), body)
        if (status !== 200) throw headlessError(status, data)
    }

    /**
     * Set a new password with the key from the reset link. On success the user is
     * logged in (`authenticated`), unless 2FA is required (`mfa_required`).
     */
    async resetPassword(key: string, password: string): Promise<HeadlessAuthResult> {
        this.client.tokenClient.clearTokens()
        const { status, data } = await this.client.httpClient.send<HeadlessBody>("post", AuthRoutes.passwordReset(), { key, password })
        return this.toResult(status, data)
    }

    /** End the server session for the stored token and clear it locally (no redirect). */
    async logoutSession(): Promise<void> {
        this.pendingToken = null
        try {
            if (this.hasToken()) {
                // allauth answers 401 on a successful logout.
                await this.client.httpClient.send("delete", AuthRoutes.session())
            }
        } catch {
            // Offline: forget the token anyway; the server session expires on its own.
        } finally {
            this.client.tokenClient.clearTokens()
        }
    }

    /**
     * Check if a session token exists locally (does not validate with server)
     */
    hasToken(): boolean {
        return this.client.tokenClient.isAuthenticated()
    }

    /**
     * Check if user is authenticated by validating session with the server
     */
    async isUserAuthenticated(): Promise<boolean> {
        if (!this.hasToken()) return false
        try {
            await this.validateSession()
            return true
        } catch {
            return false
        }
    }

    /**
     * Validate current session token with auth session endpoint.
     * HttpClient injects X-Session-Token automatically.
     */
    async validateSession(): Promise<void> {
        await this.client.httpClient.get(AuthRoutes.session())
    }

    /**
     * Stores the session token that hosted sign-in added to the address, and
     * removes the sign-in values from the address bar. Call it on the page users
     * return to when the client was created with `detectSessionInUrl: false`.
     * @returns The captured session token, or `null` when the address has none.
     */
    handleRedirect(url?: string): string | null {
        return captureSessionFromUrl(this.client.tokenClient, url)
    }

    /**
     * Uses `sessionToken` for later requests, for example one your app keeps in
     * a cookie so server-rendered pages can act as the user.
     */
    setSession(sessionToken: string): void {
        this.client.tokenClient.setAccessToken(sessionToken)
    }

    /** Forgets the stored session without redirecting. Use `logout()` to also end it on TaruviBase. */
    clearSession(): void {
        this.client.tokenClient.clearTokens()
    }

    /**
     * Get the current session token
     */
    getSessionToken(): string | null {
        return this.client.tokenClient.getSessionToken()
    }

    /**
     * Get current user from API
     * @returns Promise with user data or null if not authenticated
     */
    async getCurrentUser(): Promise<TaruviResponse<UserData> | null> {
        if (!this.hasToken()) {
            return null
        }

        try {
            return await this.client.httpClient.get<TaruviResponse<UserData>>(UserRoutes.getCurrentUser())
        } catch (error) {
            console.error("Failed to fetch current user:", error)
            return null
        }
    }
}

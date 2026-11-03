// allauth headless "app" client endpoints (no trailing slash).
const BASE = "_allauth/app/v1/auth"

export const AuthRoutes = {
    session: () => `${BASE}/session`,
    login: () => `${BASE}/login`,
    signup: () => `${BASE}/signup`,
    mfaAuthenticate: () => `${BASE}/2fa/authenticate`,
    passwordRequest: () => `${BASE}/password/request`,
    passwordReset: () => `${BASE}/password/reset`,
} as const

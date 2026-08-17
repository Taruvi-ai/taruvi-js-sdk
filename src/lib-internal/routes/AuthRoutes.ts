export const AuthRoutes = {
    session: () => "_allauth/app/v1/auth/session",
    login: () => "_allauth/app/v1/auth/login"
} as const

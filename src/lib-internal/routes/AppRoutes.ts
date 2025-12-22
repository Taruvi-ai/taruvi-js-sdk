export const AppRoutes = {
    baseUrl: (appSlug: string) => `api/app/${appSlug}`,
    roles: (): string => `/roles`
}

type AllRouteKeys = keyof typeof AppRoutes
export type AppRouteKey = Exclude<AllRouteKeys, 'baseUrl'>
export type AppUrlParams = Partial<Record<AppRouteKey, string>>

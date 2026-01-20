export const AppRoutes = {
    baseUrl: (appSlug: string) => `api/apps/${appSlug}`,
    roles: (): string => `/roles`,
    settings: (): string => "/settings/"
}

type AllRouteKeys = keyof typeof AppRoutes
export type AppRouteKey = Exclude<AllRouteKeys, 'baseUrl'>
export type AppUrlParams = Partial<Record<AppRouteKey, string>>

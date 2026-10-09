export const DatabaseRoutes = {
    baseUrl: (appSlug: string) => `api/apps/${appSlug}`,
    dataTables: (tableName: string): string => `/datatables/${tableName}/data`,
    recordId: (recordId: string): string => `/${encodeURIComponent(recordId)}`,
    upsert: (): string => `/upsert`
}

type AllRouteKeys = keyof typeof DatabaseRoutes
export type DatabaseRouteKey = Exclude<AllRouteKeys, 'baseUrl'>
export type DatabaseUrlParams = Partial<Record<DatabaseRouteKey, string>>
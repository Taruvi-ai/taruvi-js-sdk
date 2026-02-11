export const GraphRoutes = {
    baseUrl: (appSlug: string) => `api/apps/${appSlug}`,
    dataTables: (tableName: string): string => `/datatables/${tableName}/data`,
    recordId: (recordId: string): string => `/${recordId}`
}

export const GraphEdgeRoutes = {
    baseUrl: (appSlug: string) => `api/apps/${appSlug}`,
    edges: (tableName: string): string => `/datatables/${tableName}/edges`,
    edgeId: (edgeId: string): string => `/${edgeId}`
}

type AllRouteKeys = keyof typeof GraphRoutes
export type GraphRouteKey = Exclude<AllRouteKeys, 'baseUrl'>

export const DatabaseRoutes = {
    baseUrl: (appSlug: string) => `api/apps/${appSlug}`,
    dataTables: (tableName: string): string => `/datatables/${tableName}/data`,
    recordId: (recordId: string): string => `/${recordId}`
}
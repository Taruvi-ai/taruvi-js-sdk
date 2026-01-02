export const AnalyticsRoutes = {
    baseUrl: (appSlug: string, querySlug: string) => `api/apps/${appSlug}/analytics/queries/${querySlug}/execute/`
}

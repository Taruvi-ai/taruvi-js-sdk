export const SettingsRoutes = {
    baseUrl: "api/settings/",
    get: (key?: string) => key ? `api/settings/${key}/` : "api/settings/",
    update: (key: string) => `api/settings/${key}/`,
    metadata: () => "api/settings/metadata/"
}

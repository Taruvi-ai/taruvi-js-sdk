export interface TaruviConfig {
    apiKey: string      // Identifies which site the client belongs to
    appSlug: string     // Identifies which app the client belongs to
    baseUrl: string
    token?: string      // Optional: Pre-existing auth token
}

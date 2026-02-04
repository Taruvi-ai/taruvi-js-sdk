import type { TaruviResponse } from "../../types.js"

// Site settings data
export interface SiteSettingsData {
    [key: string]: unknown
}

// Response type - uses standard wrapper
export type SettingsResponse = TaruviResponse<SiteSettingsData>

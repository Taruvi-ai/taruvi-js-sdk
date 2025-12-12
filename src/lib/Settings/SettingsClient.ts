import type { Client } from "../../client.js";
import { SettingsRoutes } from "../../lib-internal/routes/SettingsRoutes.js";

export class Settings {
    private client: Client

    constructor(client: Client) {
        this.client = client
    }

    async get<T = unknown>(): Promise<T> {
        return await this.client.httpClient.get<T>(SettingsRoutes.metadata)
    }
}
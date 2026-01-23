import type { Client } from "../../client.js";
import type { TaruviConfig } from "../../types.js";
import type { AnalyticsRequest, AnalyticsResponse } from "./types.js";
import { AnalyticsRoutes } from "../../lib-internal/routes/AnalyticsRoutes.js";

export class Analytics {
    private client: Client
    private config: TaruviConfig

    constructor(client: Client) {
        this.client = client
        this.config = this.client.getConfig()
    }

    async execute<T = unknown>(querySlug: string, options: AnalyticsRequest = {}): Promise<AnalyticsResponse<T>> {
        const url = AnalyticsRoutes.baseUrl(this.config.appSlug, querySlug)

        const body = {
            params: options.params || {}
        }

        return await this.client.httpClient.post<AnalyticsResponse<T>>(url, body)
    }
}

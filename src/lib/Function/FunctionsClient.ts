import type { Client } from "../../client.js";
import type { TaruviConfig } from "../../types.js";
import type { FunctionRequest, FunctionResponse } from "./types.js";
import { FunctionRoutes } from "../../lib-internal/routes/FunctionRoutes.js";

export class Functions {
    private client: Client
    private config: TaruviConfig

    constructor(client: Client) {
        this.client = client
        this.config = this.client.getConfig()
    }

    async execute<T = unknown>(functionSlug: string, options: FunctionRequest = {}): Promise<FunctionResponse<T>> {
        const url = `${FunctionRoutes.baseUrl(this.config.appSlug, functionSlug)}/execute/`

        const body = {
            async: options.async ?? false,
            ...options.params
        }

        return await this.client.httpClient.post<FunctionResponse<T>>(url, body)
    }
}

import type { Client } from "../../client.js"
import { PolicyRoutes } from "../../lib-internal/routes/PolicyRoutes.js"
import type { TaruviConfig } from "../../types.js"
import type { Resources } from "./types.js"

export class Policy {
    private client: Client
    private config: TaruviConfig
    constructor(client: Client) {
        this.client = client
        this.config = this.client.getConfig()
    }

    async checkResource(resources: Resources) {
        const url = PolicyRoutes.baseUrl(this.config.appSlug) + PolicyRoutes.checkResource
        const body = JSON.stringify({
            resources: resources.map(r => ({
                resource: {
                    kind: `${r.entityType}:${r.tableName}`,
                    id: r.recordId,
                    attr: r.attributes || {}
                },
                actions: r.actions
            }))
        })

        return await this.client.httpClient.post(url, body)
    }
}
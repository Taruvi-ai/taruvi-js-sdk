import type { Client } from "../../client.js"
import { PolicyRoutes } from "../../lib-internal/routes/PolicyRoutes.js"
import type { TaruviConfig } from "../../types.js"
import type { Resources, Resource, PolicyCheckBatchResult, GetAllowedActionsOptions } from "./types.js"

export class Policy {
    private client: Client
    private config: TaruviConfig
    constructor(client: Client) {
        this.client = client
        this.config = this.client.getConfig()
    }

    async checkResource(resources: Resources): Promise<PolicyCheckBatchResult> {
        const url = PolicyRoutes.baseUrl(this.config.appSlug) + PolicyRoutes.checkResource
        const body = {
            resources: resources.map(r => ({
                resource: {
                    kind: r.resource,
                    id: r.recordId,
                    attr: r.attributes || {}
                },
                actions: r.actions
            }))
        }

        return await this.client.httpClient.post<PolicyCheckBatchResult>(url, body)
    }

    /**
     * Get list of allowed actions for a specific resource.
     * Identity comes from the session / API key only (`principal` is ignored).
     */
    async getAllowedActions(
        resource: Resource,
        options: GetAllowedActionsOptions = {}
    ): Promise<string[]> {
        const { actions = ['read', 'write', 'create', 'update', 'delete'], auxData } = options

        const url = PolicyRoutes.baseUrl(this.config.appSlug) + PolicyRoutes.checkResource
        const body: Record<string, unknown> = {
            resources: [{
                resource: resource,
                actions: actions
            }]
        }

        if (auxData) {
            body.auxData = auxData
        }

        const result = await this.client.httpClient.post<PolicyCheckBatchResult>(url, body)

        if (result.results && result.results.length > 0) {
            const firstResult = result.results[0]
            const actionResults = firstResult?.actions || {}
            return Object.entries(actionResults)
                .filter(([_, effect]) => effect === 'EFFECT_ALLOW')
                .map(([action, _]) => action)
        }

        return []
    }
}

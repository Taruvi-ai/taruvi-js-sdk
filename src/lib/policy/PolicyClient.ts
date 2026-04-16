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
     *
     * @param resource - Resource with kind and id
     * @param options - Optional actions list, principal override, and aux data
     * @returns List of action names that are allowed
     *
     * @example
     * ```typescript
     * const allowed = await client.policy.getAllowedActions(
     *     { kind: 'datatable:users', id: '123', attr: {} }
     * )
     * // Returns: ['read', 'write', 'update']  // 'delete' not allowed
     * ```
     */
    async getAllowedActions(
        resource: Resource,
        options: GetAllowedActionsOptions = {}
    ): Promise<string[]> {
        const { actions = ['read', 'write', 'create', 'update', 'delete'], principal, auxData } = options

        const url = PolicyRoutes.baseUrl(this.config.appSlug) + PolicyRoutes.checkResource
        const body: Record<string, unknown> = {
            resources: [{
                resource: resource,
                actions: actions
            }]
        }

        if (principal) {
            body.principal = principal
        }
        if (auxData) {
            body.auxData = auxData
        }

        const result = await this.client.httpClient.post<PolicyCheckBatchResult>(url, body)

        // Extract allowed actions
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

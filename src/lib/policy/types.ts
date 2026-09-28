import type { TaruviResponse } from "../../types.js"

export interface Principal {
    id: string
    roles: string[]
    attr: Record<string, unknown>
}

export type Resource = {
    kind: string
    id: string
    attr: Record<string, unknown>
}

export type Resources = {
    resource: string
    recordId: string
    attributes: Record<string, unknown>
    actions: string[]
}[]

export interface PolicyCheckResult {
    resource: Resource
    actions: Record<string, string>
}

export interface PolicyCheckBatchResult {
    requestId: string
    results: PolicyCheckResult[]
}

export type GetAllowedActionsOptions = {
    actions?: string[]
    /**
     * @deprecated The platform rejects an explicit principal with a 400.
     * Checks always run as the signed-in user; leave this unset.
     */
    principal?: Principal
    auxData?: Record<string, unknown>
}

// Response types - uses standard wrapper
export type ResourceCheckResponse = TaruviResponse<PolicyCheckBatchResult>

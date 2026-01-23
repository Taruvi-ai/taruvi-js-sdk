export interface Principal {
    id: string
    roles: string[]
    attr: Record<string, unknown>
}

export type Resource = {
    kind: string
    id: string
    attr: Record<string, unknown>
};

export type Resources = {
    entityType: string
    tableName: string
    recordId: string
    attributes: Record<string, unknown>
    actions: string[]
}[]

export type ResourceCheckResponse = {
    allowed: boolean
    reason: string
}

export type PolicyCheckResult = {
    resource: Resource
    actions: Record<string, string>
}

export type PolicyCheckBatchResult = {
    requestId: string
    results: PolicyCheckResult[]
}

export type GetAllowedActionsOptions = {
    actions?: string[]
    principal?: Principal
    auxData?: Record<string, unknown>
}
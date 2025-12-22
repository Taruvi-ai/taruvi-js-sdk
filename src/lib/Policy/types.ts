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
    tableName: string
    recordId: string
    attributes: Record<string, unknown>
    actions: string[]
}[]

export type ResourceCheckResponse = {
    allowed: boolean
    reason: string
}
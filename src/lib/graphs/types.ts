export type GraphInclude = 'descendants' | 'ancestors' | 'both'
export type GraphFormat = 'tree' | 'graph'

export interface GraphQueryParams {
    include?: GraphInclude
    depth?: number
    format?: GraphFormat
    relationship_type?: string[]
}

export interface GraphUrlParams {
    dataTables?: string
    recordId?: string
}

export interface EdgeRequest {
    from: number | string
    to: number | string
    type: string
    metadata?: Record<string, unknown>
}

export interface EdgeResponse {
    id: number
    from: number | string
    to: number | string
    type: string
    metadata?: Record<string, unknown>
}

export interface EdgeDeleteRequest {
    edge_ids: number[]
}

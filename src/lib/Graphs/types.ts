export type GraphInclude = 'descendants' | 'ancestors' | 'both'
export type GraphFormat = 'tree' | 'graph'

export interface GraphQueryParams {
    include?: GraphInclude
    depth?: number
    format?: GraphFormat
    graph_types?: string
}

export interface GraphUrlParams {
    dataTables?: string
    recordId?: string
}

export interface EdgeRequest {
    from_id: number
    to_id: number
    type: string
    metadata?: Record<string, unknown>
}

export interface EdgeResponse extends EdgeRequest {
    id: number
    created_at?: string
}

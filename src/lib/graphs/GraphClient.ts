import type { Client } from "../../client.js"
import type { TaruviConfig } from "../../types.js"
import type { GraphInclude, GraphFormat, GraphQueryParams, GraphUrlParams, EdgeRequest, EdgeDeleteRequest } from "./types.js"
import { GraphRoutes, GraphEdgeRoutes, type GraphRouteKey } from "../../lib-internal/routes/GraphRoutes.js"
import { buildQueryString } from "../../utils/utils.js"
import { HttpMethod } from "../../lib-internal/http/types.js"

export class Graph<T = Record<string, unknown>> {
    private client: Client
    private config: TaruviConfig
    private urlParams: GraphUrlParams
    private queryParams: GraphQueryParams
    private operation: HttpMethod | undefined
    private body: object | undefined
    private edgeRoute: string | undefined

    constructor(client: Client, urlParams: GraphUrlParams = {}, queryParams: GraphQueryParams = {}, operation?: HttpMethod, body?: object, edgeRoute?: string) {
        this.client = client
        this.config = this.client.getConfig()
        this.urlParams = urlParams
        this.queryParams = queryParams
        this.operation = operation
        this.body = body
        this.edgeRoute = edgeRoute
    }

    from<U = Record<string, unknown>>(dataTables: string): Graph<U> {
        return new Graph<U>(this.client, { ...this.urlParams, dataTables }, { ...this.queryParams })
    }

    get(recordId: string): Graph<T> {
        return new Graph<T>(this.client, { ...this.urlParams, recordId }, { ...this.queryParams })
    }

    include(direction: GraphInclude): Graph<T> {
        return new Graph<T>(this.client, { ...this.urlParams }, { ...this.queryParams, include: direction })
    }

    depth(n: number): Graph<T> {
        return new Graph<T>(this.client, { ...this.urlParams }, { ...this.queryParams, depth: n })
    }

    format(fmt: GraphFormat): Graph<T> {
        return new Graph<T>(this.client, { ...this.urlParams }, { ...this.queryParams, format: fmt })
    }

    types(types: string[]): Graph<T> {
        return new Graph<T>(this.client, { ...this.urlParams }, { ...this.queryParams, relationship_type: types })
    }

    listEdges(): Graph<T> {
        const route = GraphEdgeRoutes.baseUrl(this.config.appSlug) + GraphEdgeRoutes.edges(this.urlParams.dataTables!) + "/"
        return new Graph<T>(this.client, { ...this.urlParams }, {}, HttpMethod.GET, undefined, route)
    }

    createEdge(edges: EdgeRequest[]): Graph<T> {
        const route = GraphEdgeRoutes.baseUrl(this.config.appSlug) + GraphEdgeRoutes.edges(this.urlParams.dataTables!) + "/"
        return new Graph<T>(this.client, { ...this.urlParams }, {}, HttpMethod.POST, edges as unknown as object, route)
    }

    updateEdge(edgeId: string, edge: EdgeRequest): Graph<T> {
        const route = GraphEdgeRoutes.baseUrl(this.config.appSlug) + GraphEdgeRoutes.edges(this.urlParams.dataTables!) + GraphEdgeRoutes.edgeId(edgeId) + "/"
        return new Graph<T>(this.client, { ...this.urlParams }, {}, HttpMethod.PATCH, edge, route)
    }

    deleteEdge(edgeIds: number[]): Graph<T> {
        const route = GraphEdgeRoutes.baseUrl(this.config.appSlug) + GraphEdgeRoutes.edges(this.urlParams.dataTables!) + "/"
        const body: EdgeDeleteRequest = { edge_ids: edgeIds }
        return new Graph<T>(this.client, { ...this.urlParams }, {}, HttpMethod.DELETE, body, route)
    }

    private buildRoute(): string {
        if (this.edgeRoute) return this.edgeRoute

        return (
            GraphRoutes.baseUrl(this.config.appSlug) +
            (Object.keys(this.urlParams) as GraphRouteKey[]).reduce((acc, key) => {
                const value = this.urlParams[key]
                const routeBuilder = GraphRoutes[key]
                if (value && routeBuilder) {
                    acc += routeBuilder(value)
                }
                return acc
            }, "") +
            "/" +
            buildQueryString(this.queryParams as Record<string, unknown>)
        )
    }

    async execute(): Promise<T | T[]> {
        const url = this.buildRoute()
        const operation = this.operation || HttpMethod.GET

        switch (operation) {
            case HttpMethod.POST:
                return await this.client.httpClient.post(url, this.body)
            case HttpMethod.PATCH:
                return await this.client.httpClient.patch(url, this.body)
            case HttpMethod.DELETE:
                return await this.client.httpClient.delete(url, this.body)
            case HttpMethod.GET:
            default:
                return await this.client.httpClient.get(url)
        }
    }
}

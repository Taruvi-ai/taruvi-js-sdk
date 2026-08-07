import type { Client } from "../../client.js";
import { DatabaseRoutes, type DatabaseRouteKey } from "../../lib-internal/routes/DatabaseRoutes.js";
import { HttpMethod } from "../../lib-internal/http/types.js";
import type { TaruviConfig, DatabaseFilters } from "../../types.js";
import type { UrlParams, FilterOperator, SortOrder } from "./types.js";
import { buildQueryString } from "../../utils/utils.js";

// Used to access app data
export class Database<T = Record<string, unknown>> {
    private client: Client
    private urlParams: UrlParams
    private config: TaruviConfig
    private operation: HttpMethod | undefined
    private body: object | undefined
    private queryParams: DatabaseFilters | undefined

    constructor(client: Client, urlParams: UrlParams = {}, operation?: HttpMethod | undefined, body?: object | undefined, queryParams?: DatabaseFilters) {
        this.client = client
        this.urlParams = urlParams
        this.operation = operation
        this.body = body
        this.config = this.client.getConfig()
        this.queryParams = queryParams
    }

    from<U = Record<string, unknown>>(dataTables: string): Database<U> {
        return new Database<U>(this.client, { ...this.urlParams, dataTables }, undefined, undefined)
    }

    filter(field: string, operator: FilterOperator, value: string | number | boolean | (string | number)[]): Database<T> {
        const filterKey = operator === 'eq' ? field : `${field}__${operator}`
        // For 'in' and 'nin' operators, join array values with comma
        const filterValue = Array.isArray(value) ? value.join(',') : value
        return new Database<T>(this.client, { ...this.urlParams }, undefined, undefined, {
            ...this.queryParams,
            [filterKey]: filterValue
        })
    }

    sort(field: string, order: SortOrder = 'asc'): Database<T> {
        const ordering = order === 'desc' ? `-${field}` : field
        return new Database<T>(this.client, { ...this.urlParams }, undefined, undefined, {
            ...this.queryParams,
            ordering
        })
    }

    pageSize(size: number): Database<T> {
        return new Database<T>(this.client, { ...this.urlParams }, undefined, undefined, {
            ...this.queryParams,
            page_size: size
        })
    }

    page(num: number): Database<T> {
        return new Database<T>(this.client, { ...this.urlParams }, undefined, undefined, {
            ...this.queryParams,
            page: num
        })
    }

    populate(populate: string[]): Database<T> {
        return new Database<T>(this.client, { ...this.urlParams }, undefined, undefined, {
            ...this.queryParams,
            populate: populate.join(',')
        })
    }

    /**
     * Semantic vector similarity search on a vector column.
     * Mirrors Python SDK `vector_search`. Emits `${field}__vector_near` (JSON),
     * `_topk`, and optional `_vector_threshold` / `_vector_ef_search` / `_vector_metric`.
     */
    vectorSearch(
        field: string,
        queryVector: number[],
        options: {
            topk?: number
            threshold?: number
            efSearch?: number
            metric?: 'cosine' | 'l2' | 'ip'
        } = {}
    ): Database<T> {
        const { topk = 10, threshold, efSearch, metric } = options

        const vectorParams: DatabaseFilters = {
            [`${field}__vector_near`]: JSON.stringify(queryVector),
            _topk: topk,
        }
        if (threshold !== undefined) vectorParams._vector_threshold = threshold
        if (efSearch !== undefined) vectorParams._vector_ef_search = efSearch
        if (metric !== undefined) vectorParams._vector_metric = metric

        return new Database<T>(this.client, { ...this.urlParams }, undefined, undefined, {
            ...this.queryParams,
            ...vectorParams,
        })
    }

    /**
     * Enable hybrid search (vector + full-text fusion). Only emitted when combined
     * with `vectorSearch()` (see buildRoute guard). Mirrors Python SDK `hybrid`.
     */
    hybrid(options: { strategy?: string; alpha?: number } = {}): Database<T> {
        const { strategy = 'rrf', alpha = 0.5 } = options
        return new Database<T>(this.client, { ...this.urlParams }, undefined, undefined, {
            ...this.queryParams,
            _hybrid_strategy: strategy,
            _hybrid_alpha: alpha,
        })
    }

    get(recordId: string): Database<T> {
        return new Database<T>(this.client, { ...this.urlParams, recordId }, HttpMethod.GET)
    }

    create(body: Partial<T> | Partial<T>[]): Database<T> {
        return new Database<T>(this.client, { ...this.urlParams }, HttpMethod.POST, body as object)
    }

    update(body: Partial<T> | Partial<T>[]): Database<T> {
        return new Database<T>(this.client, { ...this.urlParams }, HttpMethod.PATCH, body as object)
    }

    delete(recordId: string): Database<T> {
        return new Database<T>(this.client, { ...this.urlParams, recordId }, HttpMethod.DELETE)
    }

    async first(): Promise<T | null> {
        const results = await this.execute()
        if (Array.isArray(results)) {
            return results[0] ?? null
        }
        return results ?? null
    }

    async count(): Promise<number> {
        const results = await this.execute()
        if (Array.isArray(results)) {
            return results.length
        }
        return 0
    }

    private buildRoute(): string {
        const path =
            DatabaseRoutes.baseUrl(this.config.appSlug) +
            (Object.keys(this.urlParams) as DatabaseRouteKey[]).reduce((acc, key) => {
                const value = this.urlParams[key]
                const routeBuilder = DatabaseRoutes[key]

                if (value && routeBuilder) {
                    acc += routeBuilder(value)
                }

                return acc
            }, "") +
            "/"

        const allParams: Record<string, unknown> = { ...this.queryParams }

        // Hybrid params are only valid alongside a vector search (mirror Python's guard).
        const hasVector = Object.keys(allParams).some((k) => k.endsWith('__vector_near'))
        if (!hasVector) {
            delete allParams._hybrid_strategy
            delete allParams._hybrid_alpha
        }

        return path + buildQueryString(allParams)
    }

    async execute(): Promise<T | T[]> {
        // Build the API URL
        const url = this.buildRoute()

        const operation = this.operation || HttpMethod.GET

        switch (operation) {
            case HttpMethod.POST:
                return await this.client.httpClient.post(url, this.body)

            case HttpMethod.PATCH:
                if (!this.urlParams.recordId) {
                    throw new Error('PATCH operation requires a record ID.')
                }
                return await this.client.httpClient.patch(url, this.body)

            case HttpMethod.DELETE:
                return await this.client.httpClient.delete(url)

            case HttpMethod.GET:
            default:
                return await this.client.httpClient.get(url)
        }
    }
}

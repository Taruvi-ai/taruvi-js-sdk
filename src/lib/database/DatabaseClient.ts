import type { Client } from "../../client.js";
import { DatabaseRoutes, type DatabaseRouteKey } from "../../lib-internal/routes/DatabaseRoutes.js";
import { HttpMethod } from "../../lib-internal/http/types.js";
import type { TaruviConfig, DatabaseFilters, TaruviResponse } from "../../types.js";
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

    search(query: string): Database<T> {
        return new Database<T>(this.client, { ...this.urlParams }, undefined, undefined, {
            ...this.queryParams,
            search: query
        })
    }

    aggregate(...expressions: string[]): Database<T> {
        return new Database<T>(this.client, { ...this.urlParams }, undefined, undefined, {
            ...this.queryParams,
            _aggregate: expressions.join(',')
        })
    }

    groupBy(...fields: string[]): Database<T> {
        return new Database<T>(this.client, { ...this.urlParams }, undefined, undefined, {
            ...this.queryParams,
            _group_by: fields.join(',')
        })
    }

    having(condition: string): Database<T> {
        return new Database<T>(this.client, { ...this.urlParams }, undefined, undefined, {
            ...this.queryParams,
            _having: condition
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
        const response = await this.execute()
        const data = response.data
        if (Array.isArray(data)) {
            return data[0] ?? null
        }
        return data ?? null
    }

    async count(): Promise<number> {
        const response = await this.execute()
        if (response.total !== undefined) {
            return response.total
        }
        return Array.isArray(response.data) ? response.data.length : 0
    }

    private buildRoute(): string {
        return (
            DatabaseRoutes.baseUrl(this.config.appSlug) +
            (Object.keys(this.urlParams) as DatabaseRouteKey[]).reduce((acc, key) => {
                const value = this.urlParams[key]
                const routeBuilder = DatabaseRoutes[key]

                if (value && routeBuilder) {
                    acc += routeBuilder(value)
                }

                return acc
            }, "") +
            "/" +
            buildQueryString(this.queryParams)
        )
    }

    async execute(): Promise<TaruviResponse<T | T[]>> {
        if (!this.urlParams.dataTables) {
            throw new Error('Table name is required. Call .from(tableName) first.')
        }

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

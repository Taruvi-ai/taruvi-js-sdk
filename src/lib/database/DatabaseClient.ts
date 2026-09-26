import type { Client } from "../../client.js";
import { DatabaseRoutes } from "../../lib-internal/routes/DatabaseRoutes.js";
import { HttpMethod } from "../../lib-internal/http/types.js";
import type { TaruviConfig, DatabaseFilters, TaruviResponse } from "../../types.js";
import type { UrlParams, FilterOperator, SortOrder, GraphInclude, GraphFormat, EdgeRequest, BackendFilterTreeRoot } from "./types.js";
import { isBackendFilterTreeRoot } from "./types.js";
import { buildQueryString } from "../../utils/utils.js";

// Query params that shape a list response rather than select rows.
const NON_FILTER_PARAMS = new Set([
    'page', 'page_size', 'ordering', 'populate', 'search', 'fields',
    'allowed_actions', '_aggregate', '_group_by', '_having',
])

interface GraphQueryParams {
    include?: GraphInclude
    depth?: number
    format?: GraphFormat
    relationship_type?: string[]
}

// Used to access app data
export class Database<T = Record<string, unknown>> {
    private client: Client
    private urlParams: UrlParams
    private config: TaruviConfig
    private operation: HttpMethod | undefined
    private body: object | undefined
    private queryParams: DatabaseFilters | undefined
    private graphParams: GraphQueryParams
    private isEdges: boolean
    private isUpsert: boolean

    constructor(client: Client, urlParams: UrlParams = {}, operation?: HttpMethod | undefined, body?: object | undefined, queryParams?: DatabaseFilters, graphParams: GraphQueryParams = {}, isEdges: boolean = false, isUpsert: boolean = false) {
        this.client = client
        this.urlParams = urlParams
        this.operation = operation
        this.body = body
        this.config = this.client.getConfig()
        this.queryParams = queryParams
        this.graphParams = graphParams
        this.isEdges = isEdges
        this.isUpsert = isUpsert
    }

    from<U = Record<string, unknown>>(dataTables: string): Database<U> {
        return new Database<U>(this.client, { ...this.urlParams, dataTables }, undefined, undefined, undefined, {}, this.isEdges)
    }

    edges(): Database<T> {
        return new Database<T>(this.client, { ...this.urlParams }, undefined, undefined, this.queryParams, { ...this.graphParams }, true)
    }

    // Graph traversal methods
    include(direction: GraphInclude): Database<T> {
        return new Database<T>(this.client, { ...this.urlParams }, this.operation, this.body, this.queryParams, { ...this.graphParams, include: direction }, this.isEdges)
    }

    depth(n: number): Database<T> {
        return new Database<T>(this.client, { ...this.urlParams }, this.operation, this.body, this.queryParams, { ...this.graphParams, depth: n }, this.isEdges)
    }

    format(fmt: GraphFormat): Database<T> {
        return new Database<T>(this.client, { ...this.urlParams }, this.operation, this.body, this.queryParams, { ...this.graphParams, format: fmt }, this.isEdges)
    }

    types(types: string[]): Database<T> {
        return new Database<T>(this.client, { ...this.urlParams }, this.operation, this.body, this.queryParams, { ...this.graphParams, relationship_type: types }, this.isEdges)
    }

    // Filter & query methods
    /**
     * JSON filter tree for the `filters` query param. Must match the platform contract:
     * root is an array of logical nodes `{ operator: "and" | "or", value: [...] }`; leaves are
     * `{ field, operator, value }` where `operator` is a **backend** token (`contains` = case-insensitive
     * substring, `containss` = case-sensitive, `eq`, `in`, …). The SDK only JSON-stringifies this value.
     */
    filters(tree: BackendFilterTreeRoot): Database<T>
    /**
     * DRF-style flat filter: `field` or `field__operator` query keys.
     */
    filters(field: string, operator: FilterOperator, value: string | number | boolean | (string | number | boolean)[]): Database<T>
    filters(
        arg0: string | BackendFilterTreeRoot,
        arg1?: FilterOperator,
        arg2?: string | number | boolean | (string | number | boolean)[]
    ): Database<T> {
        if (typeof arg0 === 'string' && arg1 !== undefined && arg2 !== undefined) {
            const field = arg0
            const operator = arg1
            const value = arg2
            const filterKey = operator === 'eq' ? field : `${field}__${operator}`
            const filterValue = Array.isArray(value) ? value.join(',') : value
            return new Database<T>(this.client, { ...this.urlParams }, undefined, undefined, {
                ...this.queryParams,
                [filterKey]: filterValue
            }, { ...this.graphParams }, this.isEdges)
        }

        if (arg1 === undefined && arg2 === undefined && isBackendFilterTreeRoot(arg0)) {
            return new Database<T>(this.client, { ...this.urlParams }, undefined, undefined, {
                ...this.queryParams,
                filters: JSON.stringify(arg0)
            }, { ...this.graphParams }, this.isEdges)
        }

        throw new TypeError(
            'Database.filters: use filters(tree) with a root array of { operator: "and"|"or", value: [...] }, or filters(field, operator, value).'
        )
    }

    /**
     * Sets the `ordering` query param (DRF-style: `-field` for desc, comma-separated for multiple).
     * - `sort('created_at', 'desc')` — one column (optional second arg defaults to `'asc'`)
     * - `sort([{ field: 'salary', order: 'desc' }, { field: 'hire_date' }])` — multiple columns
     * - `sort('-salary,hire_date')` — raw string (e.g. from `convertRefineSorters`); omit the second arg
     */
    sort(
        fieldOrFields: string | Array<{ field: string; order?: SortOrder }>,
        order?: SortOrder
    ): Database<T> {
        let newOrdering: string
        if (typeof fieldOrFields === 'string') {
            const o = order ?? 'asc'
            newOrdering = o === 'desc' ? `-${fieldOrFields}` : fieldOrFields
        } else {
            newOrdering = fieldOrFields
                .map(({ field, order: o = 'asc' }) => (o === 'desc' ? `-${field}` : field))
                .join(',')
        }
        const existing = this.queryParams?.ordering
        const ordering = existing ? `${existing},${newOrdering}` : newOrdering
        return new Database<T>(this.client, { ...this.urlParams }, undefined, undefined, {
            ...this.queryParams,
            ordering
        }, { ...this.graphParams }, this.isEdges)
    }

    pageSize(size: number): Database<T> {
        return new Database<T>(this.client, { ...this.urlParams }, undefined, undefined, {
            ...this.queryParams,
            page_size: size
        }, { ...this.graphParams }, this.isEdges)
    }

    page(num: number): Database<T> {
        return new Database<T>(this.client, { ...this.urlParams }, undefined, undefined, {
            ...this.queryParams,
            page: num
        }, { ...this.graphParams }, this.isEdges)
    }

    populate(populate: string[]): Database<T> {
        return new Database<T>(this.client, { ...this.urlParams }, undefined, undefined, {
            ...this.queryParams,
            populate: populate.join(',')
        }, { ...this.graphParams }, this.isEdges)
    }

    /** Populate all first-level relations (`?populate=*`). */
    populateAll(): Database<T> {
        return this.populate(['*'])
    }

    search(query: string): Database<T> {
        return new Database<T>(this.client, { ...this.urlParams }, undefined, undefined, {
            ...this.queryParams,
            search: query
        }, { ...this.graphParams }, this.isEdges)
    }

    /** Restrict SELECT to named columns (`?fields=a,b,c`). */
    fields(columns: string): Database<T> {
        return new Database<T>(this.client, { ...this.urlParams }, undefined, undefined, {
            ...this.queryParams,
            fields: columns
        }, { ...this.graphParams }, this.isEdges)
    }

    allowedActions(actions: string[]): Database<T> {
        const newValue = actions.join(',')
        const existing = this.queryParams?.allowed_actions
        const allowed_actions = existing ? `${existing},${newValue}` : newValue
        return new Database<T>(this.client, { ...this.urlParams }, undefined, undefined, {
            ...this.queryParams,
            allowed_actions
        }, { ...this.graphParams }, this.isEdges)
    }

    aggregate(...expressions: string[]): Database<T> {
        const newValue = expressions.join(',')
        const existing = this.queryParams?._aggregate
        const _aggregate = existing ? `${existing},${newValue}` : newValue
        return new Database<T>(this.client, { ...this.urlParams }, undefined, undefined, {
            ...this.queryParams,
            _aggregate
        }, { ...this.graphParams }, this.isEdges)
    }

    groupBy(...fields: string[]): Database<T> {
        const newValue = fields.join(',')
        const existing = this.queryParams?._group_by
        const _group_by = existing ? `${existing},${newValue}` : newValue
        return new Database<T>(this.client, { ...this.urlParams }, undefined, undefined, {
            ...this.queryParams,
            _group_by
        }, { ...this.graphParams }, this.isEdges)
    }

    having(condition: string): Database<T> {
        const existing = this.queryParams?._having
        const _having = existing ? `${existing},${condition}` : condition
        return new Database<T>(this.client, { ...this.urlParams }, undefined, undefined, {
            ...this.queryParams,
            _having
        }, { ...this.graphParams }, this.isEdges)
    }

    // CRUD methods
    get(recordId: string): Database<T> {
        return new Database<T>(this.client, { ...this.urlParams, recordId }, HttpMethod.GET, undefined, this.queryParams, { ...this.graphParams }, this.isEdges)
    }

    create(body: Partial<T> | Partial<T>[] | EdgeRequest[]): Database<T> {
        return new Database<T>(this.client, { ...this.urlParams }, HttpMethod.POST, body as object, this.queryParams, { ...this.graphParams }, this.isEdges)
    }

    upsert(body: Partial<T> | Partial<T>[], uniqueFields?: string[]): Database<T> {
        const qp = uniqueFields?.length ? { ...this.queryParams, unique_fields: uniqueFields.join(',') } : this.queryParams
        return new Database<T>(this.client, { ...this.urlParams }, HttpMethod.POST, body as object, qp, { ...this.graphParams }, this.isEdges, true)
    }

    update(body: Partial<T> | EdgeRequest): Database<T> {
        return new Database<T>(this.client, { ...this.urlParams }, HttpMethod.PATCH, body as object, this.queryParams, { ...this.graphParams }, this.isEdges)
    }

    bulkUpdate(body: Partial<T>[]): Database<T> {
        return new Database<T>(this.client, { ...this.urlParams }, HttpMethod.PATCH, body as object, this.queryParams, { ...this.graphParams }, this.isEdges)
    }

    delete(recordIdOrEdgeIds: string | number[]): Database<T> {
        if (Array.isArray(recordIdOrEdgeIds)) {
            // The data endpoint deletes several rows by `?ids=`; it ignores a JSON body.
            return this.bulkDelete(recordIdOrEdgeIds.map(String))
        }
        return new Database<T>(this.client, { ...this.urlParams, recordId: recordIdOrEdgeIds }, HttpMethod.DELETE, undefined, this.queryParams, { ...this.graphParams }, this.isEdges)
    }

    bulkDelete(ids: string[]): Database<T> {
        return new Database<T>(this.client, { ...this.urlParams }, HttpMethod.DELETE, undefined, {
            ...this.queryParams,
            ids: ids.join(',')
        }, { ...this.graphParams }, this.isEdges)
    }

    /**
     * Deletes every row that matches the current filters. The data endpoint reads
     * them from a single `?filter=` JSON object, so the flat filter keys and any
     * JSON `filters` tree are moved into it.
     */
    deleteFiltered(): Database<T> {
        const filter: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(this.queryParams ?? {})) {
            if (value !== undefined && !NON_FILTER_PARAMS.has(key)) filter[key] = value
        }
        if (Object.keys(filter).length === 0) {
            throw new Error('deleteFiltered() requires at least one filter. Call .filters(...) first.')
        }
        return new Database<T>(this.client, { ...this.urlParams }, HttpMethod.DELETE, undefined, {
            filter: JSON.stringify(filter)
        }, { ...this.graphParams }, this.isEdges)
    }

    async first(): Promise<T | null> {
        // A list read only needs one row; a single-record read is left as is.
        const isListRead = !this.urlParams.recordId && (this.operation === undefined || this.operation === HttpMethod.GET)
        const response = await (isListRead ? this.pageSize(1) : this).execute()
        const data = response.data
        if (Array.isArray(data)) {
            return data[0] ?? null
        }
        return data ?? null
    }

    async count(): Promise<number> {
        // One row is enough: with a page size the platform also returns the full total.
        const response = await (this.urlParams.recordId ? this : this.pageSize(1)).execute()
        if (response.total !== undefined) {
            return response.total
        }
        return Array.isArray(response.data) ? response.data.length : 0
    }

    private getTableName(): string {
        const table = this.urlParams.dataTables
        if (!table) throw new Error('Table name is required. Call .from(tableName) first.')
        return this.isEdges ? `${table}_edges` : table
    }

    private buildRoute(): string {
        const tableName = this.getTableName()
        const base = DatabaseRoutes.baseUrl(this.config.appSlug) +
            DatabaseRoutes.dataTables(tableName) +
            (this.urlParams.recordId ? DatabaseRoutes.recordId(this.urlParams.recordId) : '') +
            (this.isUpsert ? DatabaseRoutes.upsert() : '') +
            '/'

        // Merge database filters and graph params into one query string
        const allParams: Record<string, unknown> = { ...this.queryParams, ...this.graphParams }
        return base + buildQueryString(allParams)
    }

    async execute(): Promise<TaruviResponse<T | T[]>> {
        if (!this.urlParams.dataTables) {
            throw new Error('Table name is required. Call .from(tableName) first.')
        }

        const url = this.buildRoute()
        const operation = this.operation || HttpMethod.GET

        switch (operation) {
            case HttpMethod.POST:
                return await this.client.httpClient.post(url, this.body)

            case HttpMethod.PATCH:
                if (!this.urlParams.recordId && !Array.isArray(this.body)) {
                    throw new Error('PATCH operation requires a record ID.')
                }
                return await this.client.httpClient.patch(url, this.body)

            case HttpMethod.DELETE:
                if (this.body) {
                    return await this.client.httpClient.delete(url, this.body)
                }
                return await this.client.httpClient.delete(url)

            case HttpMethod.GET:
            default:
                return await this.client.httpClient.get(url)
        }
    }
}

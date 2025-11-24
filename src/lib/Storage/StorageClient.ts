import type { Client } from "../../client.js"
import { StorageRoutes } from "../../lib-internal/routes/StorageRoutes.js"
import { HttpMethod } from "../../lib-internal/http/types.js"
import type { TaruviConfig } from "../../types.js"
import type {
    FilterCondition,
    FilterOperator,
    QueryParams,
    SortCondition,
    SortOrder,
    StorageUrlParams,
    StorageResponse,
    SingleRecordResponse,
    CreateResponse,
    UpdateResponse,
    DeleteResponse,
    TableSchema
} from "./types.js"

/**
 * Storage Client for Taruvi Data Service
 *
 * Provides a chainable query builder interface for interacting with dynamic tables.
 * Supports filtering, sorting, pagination, foreign key population, and CRUD operations.
 *
 * @example
 * ```typescript
 * // List users with filtering, sorting, and pagination
 * const response = await storage
 *   .from('users')
 *   .where('status', 'eq', 'active')
 *   .where('age', 'gte', 18)
 *   .sort('created_at', 'desc')
 *   .paginate(0, 20)
 *   .populate('*')
 *   .fetch()
 *
 * // Get single record
 * const user = await storage.from('users').get('123')
 *
 * // Create record
 * const newUser = await storage.from('users').create({ name: 'John', age: 30 })
 *
 * // Update record
 * const updated = await storage.from('users').update('123', { age: 31 })
 *
 * // Delete record
 * await storage.from('users').delete('123')
 * ```
 */
export class Storage {
    private client: Client
    private config: TaruviConfig
    private urlParams: StorageUrlParams
    private queryParams: QueryParams
    private filters: FilterCondition[]
    private sorts: SortCondition[]
    private operation: HttpMethod | undefined
    private body: any | undefined

    constructor(
        client: Client,
        urlParams: StorageUrlParams = {},
        queryParams: QueryParams = {},
        filters: FilterCondition[] = [],
        sorts: SortCondition[] = [],
        operation?: HttpMethod,
        body?: any
    ) {
        this.client = client
        this.config = this.client.getConfig()
        this.urlParams = urlParams
        this.queryParams = queryParams
        this.filters = filters
        this.sorts = sorts
        this.operation = operation
        this.body = body
    }

    /**
     * Select a table to query
     *
     * @param tableName - Name of the table
     * @returns New Storage instance with table selected
     *
     * @example
     * ```typescript
     * storage.from('users')
     * ```
     */
    from(tableName: string): Storage {
        return new Storage(
            this.client,
            { ...this.urlParams, tableName },
            { ...this.queryParams },
            [...this.filters],
            [...this.sorts],
            this.operation,
            this.body
        )
    }

    /**
     * Add a filter condition
     *
     * @param field - Field name to filter
     * @param operator - Filter operator or value (if operator omitted, defaults to 'eq')
     * @param value - Value to filter by (optional if operator is the value)
     * @returns New Storage instance with filter added
     *
     * @example
     * ```typescript
     * // With operator
     * storage.where('age', 'gte', 18)
     * storage.where('name', 'contains', 'john')
     *
     * // Without operator (defaults to 'eq')
     * storage.where('status', 'active')
     * ```
     */
    where(field: string, operator: FilterOperator | any, value?: any): Storage {
        // If value is undefined, operator is actually the value and we default to 'eq'
        const actualOperator: FilterOperator = value === undefined ? 'eq' : (operator as FilterOperator)
        const actualValue = value === undefined ? operator : value

        const newFilters = [
            ...this.filters,
            { field, operator: actualOperator, value: actualValue }
        ]

        return new Storage(
            this.client,
            { ...this.urlParams },
            { ...this.queryParams },
            newFilters,
            [...this.sorts],
            this.operation,
            this.body
        )
    }

    /**
     * Add multiple filter conditions using an object
     *
     * @param conditions - Object with field-value pairs
     * @returns New Storage instance with filters added
     *
     * @example
     * ```typescript
     * storage.filter({
     *   status: 'active',
     *   age_gte: 18,
     *   name_contains: 'john'
     * })
     * ```
     */
    filter(conditions: Record<string, any>): Storage {
        let instance: Storage = this

        for (const [key, value] of Object.entries(conditions)) {
            // Parse field and operator from key (e.g., "age_gte" -> field: "age", operator: "gte")
            const parts = key.split('_')
            const operator = this.extractOperator(parts)
            const field = operator !== 'eq' ? parts.slice(0, -1).join('_') : key

            instance = instance.where(field, operator, value)
        }

        return instance
    }

    /**
     * Extract operator from field name parts
     * @internal
     */
    private extractOperator(parts: string[]): FilterOperator {
        if (parts.length === 1) return 'eq'

        const lastPart = parts[parts.length - 1]
        const validOperators: FilterOperator[] = [
            'eq', 'ne', 'lt', 'lte', 'gt', 'gte',
            'contains', 'ncontains', 'startswith', 'endswith',
            'in', 'nin', 'null', 'nnull', 'between'
        ]

        return validOperators.includes(lastPart as FilterOperator)
            ? (lastPart as FilterOperator)
            : 'eq'
    }

    /**
     * Add sorting
     *
     * @param field - Field name to sort by
     * @param order - Sort order ('asc' or 'desc')
     * @returns New Storage instance with sort added
     *
     * @example
     * ```typescript
     * storage.sort('created_at', 'desc')
     * storage.sort('name', 'asc').sort('age', 'desc')
     * ```
     */
    sort(field: string, order: SortOrder = 'asc'): Storage {
        const newSorts = [
            ...this.sorts,
            { field, order: order.toUpperCase() as SortOrder }
        ]

        return new Storage(
            this.client,
            { ...this.urlParams },
            { ...this.queryParams },
            [...this.filters],
            newSorts,
            this.operation,
            this.body
        )
    }

    /**
     * Set pagination using _start and _end indices
     *
     * @param start - Start index (0-based, inclusive)
     * @param end - End index (exclusive)
     * @returns New Storage instance with pagination set
     *
     * @example
     * ```typescript
     * // Get records 0-19 (first 20 records)
     * storage.paginate(0, 20)
     *
     * // Get records 20-39 (next 20 records)
     * storage.paginate(20, 40)
     * ```
     */
    paginate(start: number, end: number): Storage {
        return new Storage(
            this.client,
            { ...this.urlParams },
            { ...this.queryParams, _start: start, _end: end },
            [...this.filters],
            [...this.sorts],
            this.operation,
            this.body
        )
    }

    /**
     * Set limit for pagination
     *
     * @param limit - Maximum number of records to return
     * @returns New Storage instance with limit set
     *
     * @example
     * ```typescript
     * storage.limit(20)
     * ```
     */
    limit(limit: number): Storage {
        return new Storage(
            this.client,
            { ...this.urlParams },
            { ...this.queryParams, limit },
            [...this.filters],
            [...this.sorts],
            this.operation,
            this.body
        )
    }

    /**
     * Set offset for pagination
     *
     * @param offset - Number of records to skip
     * @returns New Storage instance with offset set
     *
     * @example
     * ```typescript
     * storage.limit(20).offset(40)
     * ```
     */
    offset(offset: number): Storage {
        return new Storage(
            this.client,
            { ...this.urlParams },
            { ...this.queryParams, offset },
            [...this.filters],
            [...this.sorts],
            this.operation,
            this.body
        )
    }

    /**
     * Populate foreign keys (similar to GraphQL field selection)
     *
     * @param fields - Comma-separated field names or '*' for all foreign keys
     * @returns New Storage instance with populate set
     *
     * @example
     * ```typescript
     * // Populate all foreign keys
     * storage.populate('*')
     *
     * // Populate specific fields
     * storage.populate('user_id,category_id')
     * ```
     */
    populate(fields: string | string[]): Storage {
        const populateValue = Array.isArray(fields) ? fields.join(',') : fields

        return new Storage(
            this.client,
            { ...this.urlParams },
            { ...this.queryParams, populate: populateValue },
            [...this.filters],
            [...this.sorts],
            this.operation,
            this.body
        )
    }

    /**
     * Build query parameters from filters and sorts
     * @internal
     */
    private buildQueryParams(): QueryParams {
        const params: QueryParams = { ...this.queryParams }

        // Add filter conditions as query parameters
        for (const filter of this.filters) {
            const key = filter.operator === 'eq'
                ? filter.field
                : `${filter.field}_${filter.operator}`

            params[key] = filter.value
        }

        // Add sort parameters
        if (this.sorts.length > 0) {
            params._sort = this.sorts.map(s => s.field).join(',')
            params._order = this.sorts.map(s => s.order).join(',')
        }

        return params
    }

    /**
     * Build the full route URL
     * @internal
     */
    private buildRoute(): string {
        let route = ""

        if (this.urlParams.tableName) {
            route += StorageRoutes.dataTable(this.urlParams.tableName)
        }

        if (this.urlParams.recordId) {
            route += StorageRoutes.recordId(this.urlParams.recordId)
        }

        return route
    }

    /**
     * Build the full URL with query parameters
     * @internal
     */
    private buildUrl(): string {
        const baseUrl = StorageRoutes.baseUrl(this.config.appSlug)
        const route = this.buildRoute()
        const queryParams = this.buildQueryParams()
        const queryString = StorageRoutes.buildQueryString(queryParams)

        return `sites/eox_site/${baseUrl}${route}/${queryString}`
    }

    /**
     * Fetch records with current query configuration
     *
     * @returns Promise resolving to response with data array and metadata
     *
     * @example
     * ```typescript
     * const response = await storage
     *   .from('users')
     *   .where('status', 'active')
     *   .sort('created_at', 'desc')
     *   .fetch()
     *
     * console.log(response.data)      // Array of records
     * console.log(response.total)     // Total count
     * console.log(response.meta)      // Pagination metadata
     * ```
     */
    async fetch<T = any>(): Promise<StorageResponse<T>> {
        if (!this.urlParams.tableName) {
            throw new Error('Table name is required. Use .from(tableName) first')
        }

        const url = this.buildUrl()
        return await this.client.httpClient.get<StorageResponse<T>>(url)
    }

    /**
     * Alias for fetch() - more intuitive for list operations
     */
    async list<T = any>(): Promise<StorageResponse<T>> {
        return this.fetch<T>()
    }

    /**
     * Get a single record by ID
     *
     * @param recordId - The record ID to fetch
     * @param populate - Optional foreign keys to populate
     * @returns Promise resolving to single record
     *
     * @example
     * ```typescript
     * const user = await storage.from('users').get('123')
     * const userWithRefs = await storage.from('users').get('123', '*')
     * ```
     */
    async get<T = any>(recordId: string, populate?: string | string[]): Promise<T> {
        if (!this.urlParams.tableName) {
            throw new Error('Table name is required. Use .from(tableName) first')
        }

        let instance = new Storage(
            this.client,
            { ...this.urlParams, recordId },
            { ...this.queryParams },
            [...this.filters],
            [...this.sorts],
            'GET',
            this.body
        )

        if (populate) {
            instance = instance.populate(populate)
        }

        const url = instance.buildUrl()
        const response = await this.client.httpClient.get<SingleRecordResponse<T>>(url)
        return response.data
    }

    /**
     * Create a new record or multiple records
     *
     * @param data - Single object or array of objects to create
     * @returns Promise resolving to created record(s)
     *
     * @example
     * ```typescript
     * // Create single record
     * const user = await storage.from('users').create({
     *   name: 'John Doe',
     *   email: 'john@example.com',
     *   age: 30
     * })
     *
     * // Bulk create
     * const users = await storage.from('users').createMany([
     *   { name: 'John', age: 30 },
     *   { name: 'Jane', age: 25 }
     * ])
     * ```
     */
    async create<T = any>(data: T | T[]): Promise<T | T[]> {
        if (!this.urlParams.tableName) {
            throw new Error('Table name is required. Use .from(tableName) first')
        }

        const instance = new Storage(
            this.client,
            { ...this.urlParams },
            { ...this.queryParams },
            [...this.filters],
            [...this.sorts],
            'POST',
            data
        )

        const url = instance.buildUrl()
        const response = await this.client.httpClient.post<CreateResponse<T>>(url, data)

        // Return the data directly (handle both single and array responses)
        return response.data
    }

    /**
     * Create multiple records (alias for create with array)
     *
     * @param data - Array of objects to create
     * @returns Promise resolving to created records
     */
    async createMany<T = any>(data: any[]): Promise<T[]> {
        return this.create<any>(data) as Promise<T[]>
    }

    /**
     * Update a record by ID
     *
     * @param recordId - The record ID to update
     * @param data - Partial data to update
     * @returns Promise resolving to updated record
     *
     * @example
     * ```typescript
     * const updated = await storage.from('users').update('123', {
     *   age: 31,
     *   status: 'premium'
     * })
     * ```
     */
    async update<T = any>(recordId: string, data: Partial<T>): Promise<T> {
        if (!this.urlParams.tableName) {
            throw new Error('Table name is required. Use .from(tableName) first')
        }

        const instance = new Storage(
            this.client,
            { ...this.urlParams, recordId },
            { ...this.queryParams },
            [...this.filters],
            [...this.sorts],
            'PATCH',
            data
        )

        const url = instance.buildUrl()
        const response = await this.client.httpClient.patch<UpdateResponse<T>>(url, data)
        return response.data
    }

    /**
     * Delete a record by ID
     *
     * @param recordId - The record ID to delete
     * @returns Promise resolving to deletion confirmation
     *
     * @example
     * ```typescript
     * await storage.from('users').delete('123')
     * ```
     */
    async delete(recordId: string): Promise<DeleteResponse> {
        if (!this.urlParams.tableName) {
            throw new Error('Table name is required. Use .from(tableName) first')
        }

        const instance = new Storage(
            this.client,
            { ...this.urlParams, recordId },
            { ...this.queryParams },
            [...this.filters],
            [...this.sorts],
            'DELETE',
            this.body
        )

        const url = instance.buildUrl()
        return await this.client.httpClient.delete<DeleteResponse>(url)
    }

    /**
     * Get the table schema
     *
     * @returns Promise resolving to table schema
     *
     * @example
     * ```typescript
     * const schema = await storage.from('users').getSchema()
     * console.log(schema.fields)
     * console.log(schema.foreignKeys)
     * ```
     */
    async getSchema(): Promise<TableSchema> {
        if (!this.urlParams.tableName) {
            throw new Error('Table name is required. Use .from(tableName) first')
        }

        // Schema endpoint would be different - adjust based on actual API
        const url = `sites/eox_site/api/apps/${this.config.appSlug}/datatables/${this.urlParams.tableName}/schema/`
        return await this.client.httpClient.get<TableSchema>(url)
    }
}

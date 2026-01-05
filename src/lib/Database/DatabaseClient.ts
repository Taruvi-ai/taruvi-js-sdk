import type { Client } from "../../client.js";
import { DatabaseRoutes, type DatabaseRouteKey } from "../../lib-internal/routes/DatabaseRoutes.js";
import { HttpMethod } from "../../lib-internal/http/types.js";
import type { TaruviConfig, DatabaseFilters } from "../../types.js";
import type { UrlParams } from "./types.js";
import { buildQueryString } from "../../utils/utils.js";

// Used to access app data
export class Database {
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

    from(dataTables: string): Database {
        return new Database(this.client, { ...this.urlParams, dataTables }, undefined, undefined)
    }

    filter(filters: DatabaseFilters): Database {
        return new Database(this.client, { ...this.urlParams }, undefined, undefined, {...this.queryParams, ...filters})
    }

    populate(populate: string[]): Database {
        return new Database(this.client, { ...this.urlParams, }, undefined, undefined, {...this.queryParams, populate: populate.join(',')})
    }

    get(recordId: string): Database {
        return new Database(this.client, this.urlParams = { ...this.urlParams, recordId }, HttpMethod.GET)
    }

    create(body: any): Database {
        return new Database(this.client, this.urlParams = { ...this.urlParams }, HttpMethod.POST, body)
    }

    update(body: any): Database {
        return new Database(this.client, this.urlParams = { ...this.urlParams }, HttpMethod.PATCH, body)
    }

    delete(recordId?: any): Database {
        return new Database(this.client, this.urlParams = { ...this.urlParams, recordId }, HttpMethod.DELETE)
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

    async execute() {
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


// TODO: Implement storage operations
// - upload files
// - download files
// - delete files
// - list files

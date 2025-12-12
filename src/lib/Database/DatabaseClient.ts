import type { Client } from "../../client.js";
import { DatabaseRoutes } from "../../lib-internal/routes/DatabaseRoutes.js";
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
    private filters: DatabaseFilters | undefined

    constructor(client: Client, urlParams: UrlParams, operation?: HttpMethod | undefined, body?: object | undefined, filters?: DatabaseFilters) {
        this.client = client
        this.urlParams = urlParams
        this.operation = operation
        this.body = body
        this.config = this.client.getConfig()
        this.filters = filters
    }

    from(dataTables: string): Database {
        return new Database(this.client, { ...this.urlParams, dataTables }, undefined, undefined)
    }

    filter(filters: DatabaseFilters): Database {
        return new Database(this.client, { ...this.urlParams }, undefined, undefined, filters)
    }

    get(recordId: string): Database {
        return new Database(this.client, this.urlParams = { ...this.urlParams, recordId }, HttpMethod.GET)
    }

    update(body: any): Database {
        return new Database(this.client, this.urlParams = { ...this.urlParams }, HttpMethod.POST, body)
    }

    delete(recordId?: any): Database {
        return new Database(this.client, this.urlParams = { ...this.urlParams, recordId }, HttpMethod.DELETE)
    }

    private buildRoute(): string {
        return DatabaseRoutes.baseUrl(this.config.appSlug) + Object.keys(this.urlParams).reduce((acc, key) => {
            if (this.urlParams[key] && DatabaseRoutes[key]) {
                acc += DatabaseRoutes[key](this.urlParams[key])
            }
            return acc
        }, "") + "/" + buildQueryString(this.filters)
    }

    async execute() {
        // Build the API URL
        const url = this.buildRoute()
        // const fullUrl = `sites/eox_site/${url}` //remove for productions because baseurl is in the appscope, no need for site

        const operation = this.operation || HttpMethod.GET

        switch (operation) {
            case HttpMethod.POST:
                return await this.client.httpClient.post(url, this.body)

            case HttpMethod.PUT:
                if (!this.urlParams.recordId) {
                    throw new Error('PUT operation requires a record ID. Use .get(recordId) before .update()')
                }
                return await this.client.httpClient.put(url, this.body)

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

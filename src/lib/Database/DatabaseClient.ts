import type { Client } from "../../client.js";
import { DatabaseRoutes } from "../../lib-internal/routes/DatabaseRoutes.js";
import { HttpMethod } from "../../lib-internal/http/types.js";
import type { TaruviConfig } from "../../types.js";
import type { UrlParams } from "./types.js";

// Used to access app data
export class Database {
    private client: Client
    private urlParams: UrlParams
    private config: TaruviConfig
    private operation: HttpMethod | undefined
    private body: object | undefined

    constructor(client: Client, urlParams: UrlParams, operation?: HttpMethod | undefined, body?: object | undefined) {
        this.client = client
        this.urlParams = urlParams
        this.operation = operation
        this.body = body
        this.config = this.client.getConfig()
    }

    from(dataTables: string): Database {
        return new Database(this.client, this.urlParams = { ...this.urlParams, dataTables })
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
            if (this.urlParams[key]) {
                acc += StorageRoutes[key](this.urlParams[key])
            }
            return acc
        }, "") + "/"
    }

    async execute() {
        // Build the API URL
        const url = this.buildRoute()
        const fullUrl = `sites/eox_site/${url}` //remove for productions because baseurl is in the appscope, no need for site

        const operation = this.operation || HttpMethod.GET

        switch (operation) {
            case HttpMethod.POST:
                return await this.client.httpClient.post(fullUrl, this.body)

            case HttpMethod.PUT:
                if (!this.urlParams.recordId) {
                    throw new Error('PUT operation requires a record ID. Use .get(recordId) before .update()')
                }
                return await this.client.httpClient.put(fullUrl, this.body)

            case HttpMethod.DELETE:
                return await this.client.httpClient.delete(fullUrl)

            case HttpMethod.GET:
            default:
                return await this.client.httpClient.get(fullUrl)
        }
    }
}


// TODO: Implement storage operations
// - upload files
// - download files
// - delete files
// - list files

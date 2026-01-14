import type { Client } from "../../client.js";
import type { SecretsUrlParams } from "./types.js";
import { HttpMethod } from "../../lib-internal/http/types.js";
import { SecretsRoutes } from "../../lib-internal/routes/SecretsRoutes.js";

export class Secrets {
    private client: Client
    private urlParams: SecretsUrlParams
    private body: object | undefined
    private method: HttpMethod

    constructor(client: Client, urlParams: SecretsUrlParams = {}, body?: object, method: HttpMethod = HttpMethod.GET) {
        this.client = client
        this.urlParams = urlParams
        this.body = body
        this.method = method
    }

    list(): Secrets {
        return new Secrets(this.client, { path: SecretsRoutes.baseUrl }, undefined, HttpMethod.GET)
    }

    get(key: string): Secrets {
        const path = SecretsRoutes.get(key)
        return new Secrets(this.client, { ...this.urlParams, path }, undefined, HttpMethod.GET)
    }

    async execute<T = unknown>(): Promise<T> {
        const url = this.urlParams.path ?? SecretsRoutes.baseUrl

        switch (this.method) {
            case HttpMethod.PUT:
                return await this.client.httpClient.put<T>(url, this.body)
            case HttpMethod.GET:
            default:
                return await this.client.httpClient.get<T>(url)
        }
    }
}

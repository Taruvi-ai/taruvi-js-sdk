import type { Client } from "../../client.js";
import { AppRoutes, type AppRouteKey } from "../../lib-internal/routes/AppRoutes.js";
import { HttpMethod } from "../../lib-internal/http/types.js";
import type { TaruviConfig } from "../../types.js";
import type { UrlParams } from "./types.js";

export class App {
    private client: Client
    private urlParams: UrlParams
    private config: TaruviConfig
    private operation: HttpMethod | undefined

    constructor(client: Client, urlParams: UrlParams = {}, operation?: HttpMethod | undefined) {
        this.client = client
        this.urlParams = urlParams
        this.operation = operation
        this.config = this.client.getConfig()
    }

    roles() {
        return new App(this.client, { ...this.urlParams, roles: "roles" }, HttpMethod.GET)
    }

    private buildRoute(): string {
        return (
            AppRoutes.baseUrl(this.config.appSlug) +
            (Object.keys(this.urlParams) as AppRouteKey[]).reduce((acc, key) => {
                const value = this.urlParams[key]
                const routeBuilder = AppRoutes[key]

                if (value && routeBuilder) {
                    acc += routeBuilder()
                }

                return acc
            }, "")
        )
    }

    async execute() {
        const url = this.buildRoute()
        const operation = this.operation || HttpMethod.GET

        switch (operation) {
            case HttpMethod.GET:
            default:
                return await this.client.httpClient.get(url)
        }
    }
}
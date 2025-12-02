import type { Client } from "../../client.js";
import type { SettingsUrlParams } from "./types.js";
import { HttpMethod } from "../../lib-internal/http/types.js";
import { SettingsRoutes } from "../../lib-internal/routes/SettingsRoutes.js";

export class Settings {
    private client: Client
    private urlParams: SettingsUrlParams
    private body: object | undefined
    private method: HttpMethod

    constructor(client: Client, urlParams: SettingsUrlParams = {}, body?: object, method: HttpMethod = HttpMethod.GET) {
        this.client = client
        this.urlParams = urlParams
        this.body = body
        this.method = method
    }

    get(key?: string): Settings {
        const path = SettingsRoutes.get(key)
        return new Settings(this.client, { ...this.urlParams, path }, undefined, HttpMethod.GET)
    }

    update(key: string, body: object): Settings {
        const path = SettingsRoutes.update(key)
        return new Settings(this.client, { ...this.urlParams, path }, body, HttpMethod.PUT)
    }

    metadata(): Settings {
        const path = SettingsRoutes.metadata()
        return new Settings(this.client, { ...this.urlParams, path }, undefined, HttpMethod.GET)
    }

    async execute<T = unknown>(): Promise<T> {
        const url = this.urlParams.path ?? SettingsRoutes.baseUrl

        switch (this.method) {
            case HttpMethod.PUT:
                return await this.client.httpClient.put<T>(url, this.body)
            case HttpMethod.GET:
            default:
                return await this.client.httpClient.get<T>(url)
        }
    }
}
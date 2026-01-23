import type { Client } from "../../client.js";
import type { SecretsUrlParams, GetSecretOptions, GetSecretsOptions, SecretsBatchResponse, SecretsBatchMetadataResponse } from "./types.js";
import { HttpMethod } from "../../lib-internal/http/types.js";
import { SecretsRoutes } from "../../lib-internal/routes/SecretsRoutes.js";
import { buildQueryString } from "../../utils/utils.js";

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

    /**
     * Get a specific secret by key.
     *
     * @param key - Secret key/name
     * @param options - Optional app context for 2-tier inheritance and tag validation
     * @returns Secrets instance for chaining with execute()
     */
    get(key: string, options: GetSecretOptions = {}): Secrets {
        const path = SecretsRoutes.get(key)
        const queryParams: Record<string, unknown> = {}

        if (options.app) queryParams.app = options.app
        if (options.tags && options.tags.length > 0) queryParams.tags = options.tags.join(',')

        return new Secrets(this.client, { ...this.urlParams, path, queryParams }, undefined, HttpMethod.GET)
    }

    /**
     * Get multiple secrets by keys using backend batch endpoint.
     * More efficient than making multiple individual requests - uses a single API call.
     *
     * @param keys - List of secret keys to retrieve
     * @param options - Optional app context and metadata flag
     * @returns Promise with dict mapping keys to values (or full objects if includeMetadata=true)
     */
    async getSecrets(keys: string[], options: GetSecretsOptions = {}): Promise<SecretsBatchResponse | SecretsBatchMetadataResponse> {
        const queryParams: Record<string, unknown> = {
            keys: keys.join(',')
        }

        if (options.app) queryParams.app = options.app
        if (options.includeMetadata) queryParams.include_metadata = options.includeMetadata

        const queryString = buildQueryString(queryParams)
        const url = SecretsRoutes.baseUrl + queryString

        return await this.client.httpClient.get<SecretsBatchResponse | SecretsBatchMetadataResponse>(url)
    }

    async execute<T = unknown>(): Promise<T> {
        const queryString = buildQueryString(this.urlParams.queryParams)
        const url = (this.urlParams.path ?? SecretsRoutes.baseUrl) + queryString

        switch (this.method) {
            case HttpMethod.PUT:
                return await this.client.httpClient.put<T>(url, this.body)
            case HttpMethod.GET:
            default:
                return await this.client.httpClient.get<T>(url)
        }
    }
}

import type { Client } from "../../client.js";
import type { BucketFileUpload, BucketUrlParams } from "./types.js";
import { StorageRoutes, type StorageRouteKey } from "../../lib-internal/routes/StorageRoutes.js";
import type { TaruviConfig, StorageFilters } from "../../types.js";
import { HttpMethod } from "../../lib-internal/http/types.js";
import { buildQueryString } from "../../utils/utils.js";

export class Storage {

    private client: Client
    private config: TaruviConfig
    private urlParams: BucketUrlParams
    private operation: HttpMethod | undefined
    private body: object | undefined
    private filters: StorageFilters | undefined


    constructor(client: Client, urlParams: BucketUrlParams = {} as BucketUrlParams, operation?: HttpMethod | undefined, body?: object, filters?: StorageFilters) {
        this.client = client
        this.urlParams = urlParams
        this.operation = operation
        this.config = this.client.getConfig()
        this.body = body
        this.filters = filters
    }


    from(bucket: string): Storage {
        return new Storage(this.client, { ...this.urlParams, bucket }, undefined, undefined)
    }

    filter(filters: StorageFilters) {
        return new Storage(this.client, { ...this.urlParams }, undefined, undefined, filters)
    }

    delete(paths: string[]): Storage {
        return new Storage(this.client, {
            ...this.urlParams, delete: "delete"
        } as any, HttpMethod.POST, { paths })
    }

    update(path: string, body: object): Storage {
        return new Storage(this.client, { ...this.urlParams, path }, HttpMethod.PUT, body)
    }

    download(path: string): Storage {
        return new Storage(this.client, { ...this.urlParams, path }, HttpMethod.GET)
    }

    upload(filesData: { files: File[], metadatas: object[], paths: string[] }): Storage {
        const formData = new FormData()
        filesData.files.forEach(f => formData.append('files', f))
        formData.append('paths', JSON.stringify(filesData.paths))
        formData.append('metadata', JSON.stringify(filesData.metadatas))
        return new Storage(this.client, {
            ...this.urlParams, upload: "upload"
        }, HttpMethod.POST, formData)
    }

    private buildRoute(): string {
        return (
            StorageRoutes.baseUrl(this.config.appSlug, this.urlParams.bucket!) +
            (Object.keys(this.urlParams) as StorageRouteKey[]).reduce((acc, key) => {
                const value = this.urlParams[key as keyof BucketUrlParams]

                if (!value) return acc

                if (key === 'path' && typeof value === 'string') {
                    acc += StorageRoutes.path(value)
                }

                if ((key === 'upload' || key === 'delete') && typeof StorageRoutes[key] === 'function') {
                    acc += (StorageRoutes[key] as () => string)()
                }

                return acc
            }, '') +
            '/' +
            buildQueryString(this.filters as Record<string, unknown>)
        )
    }



    async execute(): Promise<any> {
        const url = this.buildRoute()
        const operation = this.operation || HttpMethod.GET


        switch (operation) {
            case HttpMethod.POST:
                return await this.client.httpClient.post(url, this.body)

            case HttpMethod.PUT:
                return await this.client.httpClient.put(url, this.body)

            case HttpMethod.DELETE:
                return await this.client.httpClient.delete(url)

            case HttpMethod.GET:
            default:
                return await this.client.httpClient.get(url)
        }
    }
}
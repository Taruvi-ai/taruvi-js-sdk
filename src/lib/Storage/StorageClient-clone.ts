import type { Client } from "../../client.js";
import type { BucketFileUpload, BucketUrlParams } from "./types-clone.js";
import { StorageRoutesClone } from "../../lib-internal/routes/StorageRoutes-clone.js";
import type { TaruviConfig } from "../../types.js";
import { HttpMethod } from "../../lib-internal/http/types.js";

export class StorageClone {

    private client: Client
    private config: TaruviConfig
    private urlParams: BucketUrlParams
    private operation: HttpMethod | undefined
    private body: object | undefined


    constructor(client: Client, urlParams: BucketUrlParams, operation?: HttpMethod | undefined, body?: object) {
        this.client = client
        this.urlParams = urlParams
        this.operation = operation
        this.config = this.client.getConfig()
        this.body = body
    }


    from(bucket: string): StorageClone {
        return new StorageClone(this.client, { ...this.urlParams, bucket })
    }

    delete(path: string, filePaths: string[]): StorageClone {
        return new StorageClone(this.client, { ...this.urlParams, path }, HttpMethod.DELETE, filePaths)
    }

    update(path: string, body: object): StorageClone {
        return new StorageClone(this.client, { ...this.urlParams, path }, HttpMethod.PUT, body)
    }

    download(path: string): StorageClone {
        return new StorageClone(this.client, { ...this.urlParams, path }, HttpMethod.GET)
    }

    upload(path: string, files: BucketFileUpload[]): StorageClone {
        const formData = new FormData()
        files.forEach(file => {
            formData.append('files[]', file.file)
            formData.append('paths', JSON.stringify(file.paths))
            file.metadata && formData.append('metadata', JSON.stringify(file.metadata))
        })
        return new StorageClone(this.client, { ...this.urlParams, path }, HttpMethod.POST, formData)
    }

    private buildRoute(): string {
        return StorageRoutesClone.baseUrl(this.config.appSlug, this.urlParams.path) + Object.keys(this.urlParams).reduce((acc, key) => {
            if (this.urlParams[key]) {
                acc += StorageRoutesClone[key](this.urlParams[key])
            }
            return acc
        }, "") + "/"
    }

    async execute(): Promise<T> {
        const url = this.buildRoute()
        const operation = this.operation || HttpMethod.GET


        switch (operation) {
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
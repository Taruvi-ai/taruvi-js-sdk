import type { Client } from "../../client.js"
import { HttpMethod } from "../../lib-internal/http/types.js"

export type DatabaseOperation = HttpMethod

export interface UrlParams {
    appSlug?: string
    dataTables?: string
    recordId?: string
}

export interface DatabaseClientInterface {
    client: Client
    urlParams?: UrlParams
}
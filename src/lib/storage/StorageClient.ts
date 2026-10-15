import type { Client } from "../../client.js";
import type {
    BucketUrlParams,
    StorageResponse,
    StorageListResponse,
    StorageUploadBatchResponse,
    StorageDeleteBatchResponse,
    StorageAccessLinkResponse,
    StorageBrowseResponse,
    StorageBrowseFilters,
    StorageRequest,
    StorageUploadOptions,
    StorageUploadProgress,
    StorageSignedUrlsRequest,
    StorageSignedUrlsResponse,
} from "./types.js";
import { uploadDirectS3 } from "./directUpload.js";
import { StorageRoutes, type StorageRouteKey } from "../../lib-internal/routes/StorageRoutes.js";
import type { TaruviConfig, TaruviResponse, StorageFilters } from "../../types.js";
import { HttpMethod } from "../../lib-internal/http/types.js";
import { buildQueryString } from "../../utils/utils.js";

const DIRECT_UPLOAD_THRESHOLD = 100 * 1024 * 1024

export class Storage {

    private client: Client
    private config: TaruviConfig
    private urlParams: BucketUrlParams
    private operation: HttpMethod | undefined
    private body: object | undefined
    private filters: StorageFilters | undefined
    private queryParams: Record<string, string> | undefined
    private uploadData: StorageRequest | undefined
    private uploadOptions: StorageUploadOptions | undefined


    constructor(client: Client, urlParams: BucketUrlParams = {} as BucketUrlParams, operation?: HttpMethod | undefined, body?: object, filters?: StorageFilters, queryParams?: Record<string, string>) {
        this.client = client
        this.urlParams = urlParams
        this.operation = operation
        this.config = this.client.getConfig()
        this.body = body
        this.filters = filters
        this.queryParams = queryParams
    }


    from(bucket: string): Storage {
        return new Storage(this.client, { ...this.urlParams, bucket }, undefined, undefined)
    }

    getUrl(path: string): string {
        if (!this.urlParams.bucket) throw new Error('Bucket is required. Call .from(bucketName) first.')
        return `${this.config.apiUrl}/${StorageRoutes.baseUrl(this.config.appSlug, this.urlParams.bucket)}${StorageRoutes.path(path)}/`
    }

    filter(filters: StorageFilters) {
        return new Storage(this.client, { ...this.urlParams }, undefined, undefined, filters)
    }

    browse(filters?: StorageBrowseFilters) {
        return new Storage(this.client, { ...this.urlParams, browse: "browse" }, HttpMethod.GET, undefined, undefined, filters as Record<string, string> | undefined)
    }

    delete(paths: string[]): Storage {
        return new Storage(this.client, {
            ...this.urlParams, delete: "delete"
        }, HttpMethod.POST, { paths })
    }

    /** Update object metadata / visibility. PATCH only — no file upload. */
    update(path: string, body: object): Storage {
        return new Storage(this.client, { ...this.urlParams, path }, HttpMethod.PATCH, body)
    }

    download(path: string): Storage {
        return new Storage(this.client, { ...this.urlParams, path }, HttpMethod.GET)
    }

    /** Issue temporary download links for an S3 bucket. Individual rows can contain errors. */
    createSignedUrls(request: StorageSignedUrlsRequest): Storage {
        const body = 'paths' in request
            ? { paths: request.paths, expires_in: request.expiresIn }
            : { object_uuids: request.objectUuids, expires_in: request.expiresIn }
        return new Storage(this.client, { ...this.urlParams, sign: 'sign' }, HttpMethod.POST, body)
    }

    metadata(path: string): Storage {
        return new Storage(this.client, { ...this.urlParams, path }, HttpMethod.GET, undefined, undefined, { metadata: 'true' })
    }

    /**
     * Get a SharePoint view-access URL for an Office file.
     * Public objects are accessible without authentication.
     * @throws `ForbiddenError` (403) if denied by Cerbos `read` policy.
     */
    viewAccess(path: string): Storage {
        return new Storage(this.client, { ...this.urlParams, path, accessMode: 'view' }, HttpMethod.GET)
    }

    /**
     * Get a SharePoint edit-access URL for an Office file.
     * Authentication is always required — unauthenticated callers get 403 even on public objects.
     * @throws `ForbiddenError` (403) if unauthenticated or denied by Cerbos `update` policy.
     */
    editAccess(path: string): Storage {
        return new Storage(this.client, { ...this.urlParams, path, accessMode: 'edit' }, HttpMethod.GET)
    }

    /**
     * Upload files to a bucket. Browser files above 100 MiB use direct S3 parts
     * when the bucket is S3-backed; other uploads retain the batch API.
     * Optional progress reports file bytes, then a finalizing phase while
     * Taruvi creates the storage object record.
     */
    upload(filesData: StorageRequest, options?: StorageUploadOptions): Storage {
        // FormData is prepared now, so keep the routing state from the same
        // snapshot. Copying File references does not copy file bytes.
        const files = [...filesData.files]
        const pathsJson = JSON.stringify(filesData.paths)
        const metadataJson = JSON.stringify(filesData.metadatas)
        const formData = new FormData()
        files.forEach(f => formData.append('files', f))
        formData.append('paths', pathsJson)
        formData.append('metadata', metadataJson)
        const request = new Storage(this.client, {
            ...this.urlParams, upload: "upload"
        }, HttpMethod.POST, formData)
        request.uploadData = {
            files,
            paths: JSON.parse(pathsJson) as string[],
            metadatas: JSON.parse(metadataJson) as object[],
        }
        request.uploadOptions = options
        return request
    }

    private buildRoute(): string {
        if (!this.urlParams.bucket) {
            throw new Error('Bucket is required. Call .from(bucketName) first.')
        }

        const pathSegment = (Object.keys(this.urlParams) as StorageRouteKey[]).reduce((acc, key) => {
            const value = this.urlParams[key as keyof BucketUrlParams]

            if (!value) return acc

            if (key === 'path' && typeof value === 'string') {
                acc += StorageRoutes.path(value)
            }

            if ((key === 'upload' || key === 'sign' || key === 'delete' || key === 'browse') && typeof StorageRoutes[key] === 'function') {
                    acc += (StorageRoutes[key] as () => string)()
                }

            return acc
        }, '')

        const accessSuffix = this.urlParams.accessMode ? `/${this.urlParams.accessMode}` : ''

        return (
            StorageRoutes.baseUrl(this.config.appSlug, this.urlParams.bucket) +
            pathSegment +
            accessSuffix +
            '/' +
            buildQueryString({ ...this.filters as Record<string, unknown>, ...this.queryParams })
        )
    }

    private async postBatch(indices: number[]): Promise<StorageUploadBatchResponse> {
        const data = this.uploadData!
        const allFiles = indices.length === data.files.length
        const form = allFiles ? this.body as FormData : new FormData()
        if (!allFiles) {
            indices.forEach(index => form.append('files', data.files[index]!))
            form.append('paths', JSON.stringify(indices.map(index => data.paths[index])))
            form.append('metadata', JSON.stringify(indices.map(index => data.metadatas[index] ?? {})))
        }
        const options = this.uploadOptions
        if (!options) return this.client.httpClient.post<StorageUploadBatchResponse>(this.buildRoute(), form)
        const total = indices.reduce((sum, index) => sum + data.files[index]!.size, 0)
        const progressIndex = indices.length === 1 ? indices[0] : undefined
        const progress = (loaded: number, requestTotal?: number) => {
            const bytes = Math.round(total * Math.min(1, loaded / (requestTotal || total || 1)))
            const event: StorageUploadProgress = {
                loaded: bytes, total, phase: 'uploading',
                ...(progressIndex !== undefined && { index: progressIndex }),
            }
            options.onProgress?.(event)
        }
        const response = await this.client.httpClient.post<StorageUploadBatchResponse>(
            this.buildRoute(), form, {
                ...(options.signal && { signal: options.signal }),
                ...(options.onProgress && { onUploadProgress: progress }),
            },
        )
        if (response.data.uploaded_count === response.data.total && response.data.failed_count === 0) {
            options.onProgress?.({
                loaded: total, total, phase: 'complete',
                ...(progressIndex !== undefined && { index: progressIndex }),
            })
        }
        return response
    }

    private async executeUpload(): Promise<StorageUploadBatchResponse> {
        const data = this.uploadData!
        const large = data.files.map((file, index) => file.size > DIRECT_UPLOAD_THRESHOLD ? index : -1)
            .filter(index => index >= 0)
        if (!large.length) return this.postBatch(data.files.map((_, index) => index))
        // Direct S3 transfer is a browser feature. Keep existing Node/React Native
        // uploads and malformed batch validation on the established API route.
        if (typeof XMLHttpRequest === 'undefined' || data.paths.length !== data.files.length) {
            return this.postBatch(data.files.map((_, index) => index))
        }
        if (!this.urlParams.bucket) throw new Error('Bucket is required. Call .from(bucketName) first.')

        const bucketUrl = StorageRoutes.bucket(this.config.appSlug, this.urlParams.bucket)
        const bucket = await this.client.httpClient.get<{ storage_provider: string }>(bucketUrl)
        if (bucket.storage_provider === 'sharepoint') {
            return this.postBatch(data.files.map((_, index) => index))
        }
        if (bucket.storage_provider !== 's3') throw new Error('Unknown bucket storage provider')

        const small = data.files.map((_, index) => index).filter(index => !large.includes(index))
        const successful: StorageUploadBatchResponse['data']['successful'] = []
        const failed: StorageUploadBatchResponse['data']['failed'] = []
        if (small.length) {
            const batch = await this.postBatch(small)
            successful.push(...batch.data.successful.map(item => ({ ...item, index: small[item.index]! })))
            failed.push(...batch.data.failed.map(item => ({ ...item, index: small[item.index]! })))
        }
        const directUploadsUrl = StorageRoutes.directUploads(this.config.appSlug, this.urlParams.bucket)
        for (const index of large) {
            try {
                const object = await uploadDirectS3(
                    this.client, directUploadsUrl, data.files[index]!, data.paths[index]!,
                    data.metadatas[index] ?? {}, index, this.uploadOptions,
                )
                successful.push({ index, path: data.paths[index]!, object })
            } catch (error) {
                if (this.uploadOptions?.signal?.aborted) throw error
                failed.push({
                    index, path: data.paths[index]!,
                    error: error instanceof Error ? error.message : 'Direct upload failed',
                })
            }
        }
        successful.sort((a, b) => a.index - b.index)
        failed.sort((a, b) => a.index - b.index)
        const total = data.files.length
        const count = successful.length
        const message = count === total ? `Successfully uploaded ${count} file${count === 1 ? '' : 's'}`
            : count ? `Uploaded ${count} of ${total} files` : 'No files were uploaded'
        return {
            status: 'success',
            success: count > 0,
            message,
            data: { message, uploaded_count: count, failed_count: failed.length, total, successful, failed },
        }
    }



    /**
     * Execute the storage operation.
     * Returns different types based on the operation:
     * - List files: StorageListResponse
     * - Browse directory: StorageBrowseResponse
     * - Download: Blob
     * - Signed download links: StorageSignedUrlsResponse
     * - Upload: StorageUploadBatchResponse
     * - Delete: StorageDeleteBatchResponse
     * - Update: StorageResponse
     * - View / edit access: TaruviResponse<StorageAccessLinkResponse>
     */
    async execute<T = StorageListResponse | StorageBrowseResponse | StorageResponse | StorageUploadBatchResponse | StorageDeleteBatchResponse | StorageSignedUrlsResponse | Blob | TaruviResponse<StorageAccessLinkResponse>>(): Promise<T> {
        if (this.uploadData) return await this.executeUpload() as T
        const url = this.buildRoute()
        const operation = this.operation || HttpMethod.GET

        switch (operation) {
            case HttpMethod.POST:
                return await this.client.httpClient.post<T>(url, this.body)

            case HttpMethod.PUT:
                return await this.client.httpClient.put<T>(url, this.body)

            case HttpMethod.PATCH:
                return await this.client.httpClient.patch<T>(url, this.body)

            case HttpMethod.DELETE:
                return await this.client.httpClient.delete<T>(url)

            case HttpMethod.GET:
            default: {
                const isDownload = this.urlParams.path && !this.queryParams?.metadata && !this.urlParams.accessMode && !this.urlParams.browse
                return await this.client.httpClient.get<T>(url, isDownload ? { responseType: 'blob' } : undefined)
            }
        }
    }
}

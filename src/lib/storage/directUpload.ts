import type { Client } from '../../client.js'
import type { TaruviResponse } from '../../types.js'
import type { StorageObject, StorageUploadOptions } from './types.js'

interface UploadStart {
    id: string
    uploadToken: string
    partSize: number
    partCount: number
    parts: Array<{ partNumber: number, url: string }>
}

const CONCURRENT_PARTS = 3
const MAX_PART_ATTEMPTS = 3

function abortError(): DOMException {
    return new DOMException('Upload cancelled', 'AbortError')
}

class PartUploadError extends Error {
    constructor(readonly status: number) {
        super(status ? `S3 part upload failed (HTTP ${status})` : 'S3 part upload failed (network or CORS error)')
    }
}

function putPart(url: string, body: Blob, signal: AbortSignal, onProgress: (loaded: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal.aborted) return reject(abortError())
        const xhr = new XMLHttpRequest()
        const cleanup = () => signal.removeEventListener('abort', abort)
        const abort = () => xhr.abort()
        xhr.open('PUT', url)
        xhr.withCredentials = false
        xhr.upload.onprogress = event => {
            if (event.lengthComputable) onProgress(Math.min(event.loaded, body.size))
        }
        xhr.onload = () => {
            cleanup()
            if (xhr.status >= 200 && xhr.status < 300) resolve()
            else reject(new PartUploadError(xhr.status))
        }
        xhr.onerror = () => { cleanup(); reject(new PartUploadError(0)) }
        xhr.onabort = () => { cleanup(); reject(abortError()) }
        signal.addEventListener('abort', abort, { once: true })
        xhr.send(body)
    })
}

function retryable(error: unknown): boolean {
    return error instanceof PartUploadError &&
        (error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500)
}

function retryDelay(signal: AbortSignal, attempt: number): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal.aborted) return reject(abortError())
        const abort = () => { clearTimeout(timer); reject(abortError()) }
        const timer = setTimeout(() => {
            signal.removeEventListener('abort', abort)
            resolve()
        }, 250 * 2 ** (attempt - 1))
        signal.addEventListener('abort', abort, { once: true })
    })
}

async function transferParts(
    file: File, upload: UploadStart, index: number, options?: StorageUploadOptions,
): Promise<void> {
    if (upload.parts.length !== upload.partCount || upload.partSize <= 0 ||
        upload.parts.some((part, position) => part.partNumber !== position + 1)) {
        throw new Error('Invalid direct upload response from Taruvi')
    }
    const controller = new AbortController()
    const cancel = () => controller.abort()
    options?.signal?.addEventListener('abort', cancel, { once: true })
    if (options?.signal?.aborted) controller.abort()
    const completed = new Map<number, number>()
    const inFlight = new Map<number, number>()
    const report = () => {
        const loaded = [...completed.values(), ...inFlight.values()].reduce((sum, value) => sum + value, 0)
        options?.onProgress?.({ index, loaded: Math.min(loaded, file.size), total: file.size, phase: 'uploading' })
    }
    let next = 0
    let firstError: unknown
    const worker = async () => {
        while (next < upload.parts.length && !controller.signal.aborted) {
            const partIndex = next++
            const part = upload.parts[partIndex]!
            const start = partIndex * upload.partSize
            const end = Math.min(start + upload.partSize, file.size)
            const size = end - start
            for (let attempt = 1; attempt <= MAX_PART_ATTEMPTS; attempt++) {
                try {
                    await putPart(part.url, file.slice(start, end), controller.signal, loaded => {
                        inFlight.set(partIndex, loaded)
                        report()
                    })
                    inFlight.delete(partIndex)
                    completed.set(partIndex, size)
                    report()
                    break
                } catch (error) {
                    inFlight.delete(partIndex)
                    report()
                    if (attempt < MAX_PART_ATTEMPTS && retryable(error) && !controller.signal.aborted) {
                        await retryDelay(controller.signal, attempt)
                        continue
                    }
                    throw error
                }
            }
        }
    }
    try {
        await Promise.allSettled(Array.from({ length: Math.min(CONCURRENT_PARTS, upload.parts.length) }, async () => {
            try { await worker() }
            catch (error) {
                if (!firstError || (firstError instanceof Error && firstError.name === 'AbortError')) firstError = error
                controller.abort()
            }
        }))
        if (options?.signal?.aborted) throw abortError()
        if (firstError) throw firstError
        if (completed.size !== upload.partCount) throw new Error('S3 upload stopped before all parts completed')
    } finally {
        options?.signal?.removeEventListener('abort', cancel)
    }
}

export async function uploadDirectS3(
    client: Client, endpoint: string, file: File, path: string, metadata: object,
    index: number, options?: StorageUploadOptions,
): Promise<StorageObject> {
    for (let sessionAttempt = 0; sessionAttempt < 2; sessionAttempt++) {
        if (options?.signal?.aborted) throw abortError()
        let start: TaruviResponse<UploadStart>
        try {
            start = await client.httpClient.post<TaruviResponse<UploadStart>>(
                endpoint, { path, size: file.size, mimetype: file.type || 'application/octet-stream', metadata },
                options?.signal ? { signal: options.signal } : undefined,
            )
        } catch (error) {
            if (options?.signal?.aborted) throw abortError()
            throw error
        }
        const upload = start.data
        const sessionUrl = `${endpoint}${upload.id}/`
        const headers = { 'X-Taruvi-Upload-Token': upload.uploadToken }
        try {
            await transferParts(file, upload, index, options)
        } catch (error) {
            try { await client.httpClient.delete(sessionUrl, undefined, { headers }) }
            catch { /* Keep the original error; S3 lifecycle cleanup is the fallback. */ }
            if (error instanceof PartUploadError && error.status === 403 &&
                sessionAttempt === 0 && !options?.signal?.aborted) continue
            throw error
        }
        if (options?.signal?.aborted) {
            try { await client.httpClient.delete(sessionUrl, undefined, { headers }) }
            catch { /* Keep cancellation as the result. */ }
            throw abortError()
        }
        options?.onProgress?.({ index, loaded: file.size, total: file.size, phase: 'finalizing' })
        // A lost Complete response can follow a successful S3 completion; the
        // backend safely recognizes the same signed token on a retry.
        // Do not cancel this request: S3 and the DB may finish before the reply,
        // so reporting cancellation here could hide a successfully saved file.
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const result = await client.httpClient.post<TaruviResponse<StorageObject>>(
                    `${sessionUrl}complete/`, {}, { headers },
                )
                options?.onProgress?.({ index, loaded: file.size, total: file.size, phase: 'complete' })
                return result.data
            } catch (error) {
                const status = error && typeof error === 'object' && 'statusCode' in error
                    ? Number(error.statusCode) : undefined
                if (attempt === 0 && (status === 0 || (status !== undefined && status >= 500))) continue
                throw error
            }
        }
    }
    throw new Error('Direct upload could not be completed')
}

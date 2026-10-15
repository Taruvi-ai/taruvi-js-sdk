import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Storage } from '../../../src/lib/storage/StorageClient.js'
import type { StorageUploadBatchResponse } from '../../../src/lib/storage/types.js'
import type { Client } from '../../../src/client.js'

const MIB = 1024 * 1024
const mockHttp = { get: vi.fn(), post: vi.fn(), delete: vi.fn() }
const client = {
    getConfig: () => ({ appSlug: 'demo', apiUrl: 'https://api.example.test' }),
    httpClient: mockHttp,
} as unknown as Client

function file(name: string, size: number): File {
    const value = new File(['x'], name, { type: 'application/pdf' })
    Object.defineProperty(value, 'size', { value: size })
    Object.defineProperty(value, 'slice', { value: (start: number, end: number) => {
        const part = new Blob(['x'])
        Object.defineProperty(part, 'size', { value: end - start })
        return part
    } })
    return value
}

function startResponse(size: number) {
    const partSize = 32 * MIB
    return { status: 'success', data: {
        id: 'upload-id', uploadToken: 'signed-token', size, partSize,
        partCount: Math.ceil(size / partSize), expiresAt: new Date(Date.now() + 3600000).toISOString(),
        parts: Array.from({ length: Math.ceil(size / partSize) }, (_, index) => ({
            partNumber: index + 1, url: `https://s3.example.test/part-${index + 1}`,
        })),
    } }
}

const storedObject = { id: 123, path: 'large.pdf', size: 101 * MIB }

class FakeXHR {
    static requests: Array<{ url: string, size: number, credentials: boolean }> = []
    static statuses: number[] = []
    static hold = false
    upload: { onprogress?: (event: { loaded: number, lengthComputable: boolean }) => void } = {}
    onload?: () => void
    onerror?: () => void
    onabort?: () => void
    status = 0
    withCredentials = false
    private url = ''

    open(method: string, url: string) {
        expect(method).toBe('PUT')
        this.url = url
    }
    send(body: Blob) {
        FakeXHR.requests.push({ url: this.url, size: body.size, credentials: this.withCredentials })
        this.upload.onprogress?.({ loaded: body.size, lengthComputable: true })
        this.status = FakeXHR.statuses.shift() ?? 200
        if (!FakeXHR.hold) queueMicrotask(() => this.onload?.())
    }
    abort() { this.onabort?.() }
}

describe('large storage uploads', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        FakeXHR.requests = []
        FakeXHR.statuses = []
        FakeXHR.hold = false
        vi.stubGlobal('XMLHttpRequest', FakeXHR)
    })
    afterEach(() => vi.unstubAllGlobals())

    it('leaves files at or below 100 MiB on the existing batch endpoint', async () => {
        mockHttp.post.mockResolvedValue({ status: 'success', data: { successful: [] } })
        await new Storage(client).from('docs').upload({
            files: [file('small.pdf', 100 * MIB)], paths: ['small.pdf'], metadatas: [{}],
        }).execute()
        expect(mockHttp.get).not.toHaveBeenCalled()
        expect(mockHttp.post).toHaveBeenCalledOnce()
        expect(mockHttp.post.mock.calls[0]?.[0]).toContain('/batch-upload/')
    })

    it('uploads S3 parts directly and completes before reporting success', async () => {
        mockHttp.get.mockResolvedValue({ storage_provider: 's3' })
        mockHttp.post.mockResolvedValueOnce(startResponse(101 * MIB))
            .mockResolvedValueOnce({ status: 'success', data: storedObject })
        const progress: Array<{ loaded: number, phase: string }> = []
        const result = await new Storage(client).from('docs').upload({
            files: [file('large.pdf', 101 * MIB)], paths: ['large.pdf'], metadatas: [{}],
        }, { onProgress: event => progress.push(event) }).execute<StorageUploadBatchResponse>()

        expect(mockHttp.get.mock.calls[0]?.[0]).toContain('/storage/buckets/docs/')
        expect(mockHttp.post.mock.calls[0]?.[0]).toContain('/presigned-uploads/')
        expect(FakeXHR.requests.map(request => request.size)).toEqual([32, 32, 32, 5].map(n => n * MIB))
        expect(FakeXHR.requests.every(request => !request.credentials)).toBe(true)
        expect(mockHttp.post.mock.calls[1]?.[2]?.headers).toEqual({ 'X-Taruvi-Upload-Token': 'signed-token' })
        expect(result.data.successful).toEqual([{ index: 0, path: 'large.pdf', object: storedObject }])
        expect(progress.at(-2)).toMatchObject({ loaded: 101 * MIB, phase: 'finalizing' })
        expect(progress.at(-1)).toMatchObject({ loaded: 101 * MIB, phase: 'complete' })
    })

    it('keeps a large SharePoint upload on the existing batch endpoint', async () => {
        mockHttp.get.mockResolvedValue({ storage_provider: 'sharepoint' })
        mockHttp.post.mockResolvedValue({ status: 'success', data: { successful: [] } })
        await new Storage(client).from('docs').upload({
            files: [file('large.pdf', 101 * MIB)], paths: ['large.pdf'], metadatas: [{}],
        }).execute()
        expect(mockHttp.post).toHaveBeenCalledOnce()
        expect(mockHttp.post.mock.calls[0]?.[0]).toContain('/batch-upload/')
        expect(FakeXHR.requests).toHaveLength(0)
    })

    it('keeps non-browser uploads on the existing endpoint', async () => {
        vi.stubGlobal('XMLHttpRequest', undefined)
        mockHttp.post.mockResolvedValue({ status: 'success', data: { successful: [] } })
        await new Storage(client).from('docs').upload({
            files: [file('large.pdf', 101 * MIB)], paths: ['large.pdf'], metadatas: [{}],
        }).execute()
        expect(mockHttp.get).not.toHaveBeenCalled()
        expect(mockHttp.post.mock.calls[0]?.[0]).toContain('/batch-upload/')
    })

    it('preserves original indexes when small and direct files are mixed', async () => {
        mockHttp.get.mockResolvedValue({ storage_provider: 's3' })
        mockHttp.post.mockResolvedValueOnce({ status: 'success', data: {
            successful: [{ index: 0, path: 'small.pdf', object: { id: 1 } }], failed: [],
        } }).mockResolvedValueOnce(startResponse(101 * MIB))
            .mockResolvedValueOnce({ status: 'success', data: storedObject })
        const result = await new Storage(client).from('docs').upload({
            files: [file('small.pdf', MIB), file('large.pdf', 101 * MIB)],
            paths: ['small.pdf', 'large.pdf'], metadatas: [{}, {}],
        }).execute<StorageUploadBatchResponse>()
        const form = mockHttp.post.mock.calls[0]?.[1] as FormData
        expect(form.getAll('files')).toHaveLength(1)
        expect(result.data.successful.map(item => item.index)).toEqual([0, 1])
        expect(result.data.total).toBe(2)
        expect(result).toMatchObject({
            status: 'success', success: true,
            data: { message: 'Successfully uploaded 2 files' },
        })
    })

    it('uses the same prepared upload data if the caller changes its arrays later', async () => {
        mockHttp.get.mockResolvedValue({ storage_provider: 's3' })
        mockHttp.post.mockResolvedValueOnce(startResponse(101 * MIB))
            .mockResolvedValueOnce({ status: 'success', data: storedObject })
        const input = {
            files: [file('large.pdf', 101 * MIB)], paths: ['original.pdf'],
            metadatas: [{ label: 'original' }],
        }
        const request = new Storage(client).from('docs').upload(input)
        input.files[0] = file('small.pdf', MIB)
        input.paths[0] = 'changed.pdf'
        input.metadatas[0]!.label = 'changed'
        const result = await request.execute<StorageUploadBatchResponse>()
        expect(mockHttp.post.mock.calls[0]?.[1]).toMatchObject({
            path: 'original.pdf', size: 101 * MIB, metadata: { label: 'original' },
        })
        expect(result.data.successful[0]?.path).toBe('original.pdf')
    })

    it('does not report complete progress when every batch file failed', async () => {
        mockHttp.post.mockResolvedValue({
            status: 'success', success: false,
            data: { uploaded_count: 0, failed_count: 1, total: 1, successful: [], failed: [], message: 'No files were uploaded' },
        })
        const phases: string[] = []
        await new Storage(client).from('docs').upload({
            files: [file('small.pdf', MIB)], paths: ['small.pdf'], metadatas: [{}],
        }, { onProgress: event => phases.push(event.phase) }).execute()
        expect(phases).not.toContain('complete')
    })

    it('retries a transient S3 part error without double-counting progress', async () => {
        mockHttp.get.mockResolvedValue({ storage_provider: 's3' })
        mockHttp.post.mockResolvedValueOnce(startResponse(101 * MIB))
            .mockResolvedValueOnce({ status: 'success', data: storedObject })
        FakeXHR.statuses = [503]
        const progress: number[] = []
        await new Storage(client).from('docs').upload({
            files: [file('large.pdf', 101 * MIB)], paths: ['large.pdf'], metadatas: [{}],
        }, { onProgress: event => progress.push(event.loaded) }).execute()
        expect(FakeXHR.requests).toHaveLength(5)
        expect(Math.max(...progress)).toBe(101 * MIB)
    })

    it('starts a fresh upload after an expired S3 part URL', async () => {
        mockHttp.get.mockResolvedValue({ storage_provider: 's3' })
        mockHttp.post.mockResolvedValueOnce(startResponse(101 * MIB))
            .mockResolvedValueOnce(startResponse(101 * MIB))
            .mockResolvedValueOnce({ status: 'success', data: storedObject })
        mockHttp.delete.mockResolvedValue(undefined)
        FakeXHR.statuses = [403]
        const result = await new Storage(client).from('docs').upload({
            files: [file('large.pdf', 101 * MIB)], paths: ['large.pdf'], metadatas: [{}],
        }).execute<StorageUploadBatchResponse>()
        expect(result.data.uploaded_count).toBe(1)
        expect(mockHttp.delete).toHaveBeenCalledOnce()
        expect(mockHttp.post.mock.calls.filter(call => String(call[0]).endsWith('/presigned-uploads/'))).toHaveLength(2)
    })

    it('records a failed file and cancels its S3 session on a permanent part error', async () => {
        mockHttp.get.mockResolvedValue({ storage_provider: 's3' })
        mockHttp.post.mockResolvedValue(startResponse(101 * MIB))
        mockHttp.delete.mockResolvedValue(undefined)
        FakeXHR.statuses = [400]
        const result = await new Storage(client).from('docs').upload({
            files: [file('large.pdf', 101 * MIB)], paths: ['large.pdf'], metadatas: [{}],
        }).execute<StorageUploadBatchResponse>()
        expect(result.data.failed).toMatchObject([{ index: 0, path: 'large.pdf' }])
        expect(result.data.uploaded_count).toBe(0)
        expect(mockHttp.delete).toHaveBeenCalledOnce()
    })

    it('retries Complete with the same token after a transient API failure', async () => {
        mockHttp.get.mockResolvedValue({ storage_provider: 's3' })
        mockHttp.post.mockResolvedValueOnce(startResponse(101 * MIB))
            .mockRejectedValueOnce({ statusCode: 500 })
            .mockResolvedValueOnce({ status: 'success', data: storedObject })
        const result = await new Storage(client).from('docs').upload({
            files: [file('large.pdf', 101 * MIB)], paths: ['large.pdf'], metadatas: [{}],
        }).execute<StorageUploadBatchResponse>()
        expect(result.data.uploaded_count).toBe(1)
        expect(mockHttp.post.mock.calls[1]?.[2]?.headers).toEqual(mockHttp.post.mock.calls[2]?.[2]?.headers)
        expect(mockHttp.delete).not.toHaveBeenCalled()
    })

    it('finishes finalization even if the caller aborts after all S3 parts arrived', async () => {
        const controller = new AbortController()
        mockHttp.get.mockResolvedValue({ storage_provider: 's3' })
        let finish!: (value: unknown) => void
        mockHttp.post.mockResolvedValueOnce(startResponse(101 * MIB))
            .mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
        const upload = new Storage(client).from('docs').upload({
            files: [file('large.pdf', 101 * MIB)], paths: ['large.pdf'], metadatas: [{}],
        }, { signal: controller.signal }).execute<StorageUploadBatchResponse>()
        for (let attempt = 0; attempt < 20 && mockHttp.post.mock.calls.length < 2; attempt++) await Promise.resolve()
        expect(mockHttp.post.mock.calls).toHaveLength(2)
        controller.abort()
        finish({ status: 'success', data: storedObject })
        const result = await upload
        expect(result.data.uploaded_count).toBe(1)
        expect(mockHttp.post.mock.calls[1]?.[2]?.signal).toBeUndefined()
        expect(mockHttp.delete).not.toHaveBeenCalled()
    })

    it('aborts an unfinished multipart upload when cancelled', async () => {
        const controller = new AbortController()
        FakeXHR.hold = true
        mockHttp.get.mockResolvedValue({ storage_provider: 's3' })
        mockHttp.post.mockResolvedValue(startResponse(101 * MIB))
        mockHttp.delete.mockResolvedValue(undefined)
        const upload = new Storage(client).from('docs').upload({
            files: [file('large.pdf', 101 * MIB)], paths: ['large.pdf'], metadatas: [{}],
        }, { signal: controller.signal }).execute()
        for (let attempt = 0; attempt < 10 && !FakeXHR.requests.length; attempt++) await Promise.resolve()
        expect(FakeXHR.requests.length).toBeGreaterThan(0)
        controller.abort()
        await expect(upload).rejects.toMatchObject({ name: 'AbortError' })
        expect(mockHttp.delete.mock.calls[0]?.[0]).toContain('/presigned-uploads/upload-id/')
        expect(mockHttp.delete.mock.calls[0]?.[2]?.headers).toEqual({ 'X-Taruvi-Upload-Token': 'signed-token' })
    })

    it('reports cancellation while Start is still pending', async () => {
        const controller = new AbortController()
        mockHttp.get.mockResolvedValue({ storage_provider: 's3' })
        mockHttp.post.mockImplementationOnce((_url, _body, options) => new Promise((_resolve, reject) => {
            options.signal.addEventListener('abort', () => reject({ statusCode: 0 }))
        }))
        const upload = new Storage(client).from('docs').upload({
            files: [file('large.pdf', 101 * MIB)], paths: ['large.pdf'], metadatas: [{}],
        }, { signal: controller.signal }).execute()
        for (let attempt = 0; attempt < 10 && !mockHttp.post.mock.calls.length; attempt++) await Promise.resolve()
        controller.abort()
        await expect(upload).rejects.toMatchObject({ name: 'AbortError' })
        expect(mockHttp.delete).not.toHaveBeenCalled()
    })
})

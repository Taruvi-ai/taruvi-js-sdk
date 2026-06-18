import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Storage } from '../../../src/lib/storage/StorageClient.js'
import { Client } from '../../../src/client.js'
import type { StorageResponse, StorageListResponse, StorageDeleteBatchResponse, StorageBrowseResponse } from '../../../src/lib/storage/types.js'

const mockHttpClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
}

const mockClient = {
    getConfig: () => ({ apiKey: 'test-key', appSlug: 'test-app', apiUrl: 'https://api.test.com' }),
    httpClient: mockHttpClient
} as unknown as Client

describe('Storage', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('from()', () => {
        it('returns new Storage instance with bucket name', () => {
            const storage = new Storage(mockClient)
            const result = storage.from('documents')
            expect(result).toBeInstanceOf(Storage)
        })
    })

    describe('filter()', () => {
        it('applies search filter', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Storage(mockClient).from('documents').filter({ search: 'invoice' }).execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('search=invoice'), undefined)
        })

        it('applies size filters', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Storage(mockClient).from('documents').filter({ size__gte: 1024, size__lte: 10485760 }).execute()
            const url = mockHttpClient.get.mock.calls[0][0]
            expect(url).toContain('size__gte=1024')
            expect(url).toContain('size__lte=10485760')
        })

        it('applies date filters', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Storage(mockClient).from('documents').filter({ created_at__gte: '2024-01-01' }).execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('created_at__gte=2024-01-01'), undefined)
        })

        it('applies mimetype filter', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Storage(mockClient).from('documents').filter({ mimetype: 'application/pdf' }).execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('mimetype=application%2Fpdf'), undefined)
        })

        it('applies visibility filter', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Storage(mockClient).from('documents').filter({ visibility: 'public' }).execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('visibility=public'), undefined)
        })

        it('applies pagination filters', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Storage(mockClient).from('documents').filter({ page: 1, page_size: 20 }).execute()
            const url = mockHttpClient.get.mock.calls[0][0]
            expect(url).toContain('page=1')
            expect(url).toContain('page_size=20')
        })

        it('applies ordering filter', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Storage(mockClient).from('documents').filter({ ordering: '-created_at' }).execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('ordering=-created_at'), undefined)
        })
    })

    describe('download()', () => {
        it('calls httpClient.get with encoded path', async () => {
            mockHttpClient.get.mockResolvedValue(new Blob())
            await new Storage(mockClient).from('documents').download('path/to/file.pdf').execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('path%2Fto%2Ffile.pdf'), { responseType: 'blob' })
        })
    })

    describe('upload()', () => {
        it('calls httpClient.post with FormData', async () => {
            const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
            mockHttpClient.post.mockResolvedValue({ uploaded_count: 1 })
            
            await new Storage(mockClient).from('documents').upload({
                files: [mockFile],
                metadatas: [{ name: 'test' }],
                paths: ['test.pdf']
            }).execute()
            
            expect(mockHttpClient.post).toHaveBeenCalledWith(
                expect.stringContaining('/batch-upload/'),
                expect.any(FormData)
            )
        })
    })

    describe('delete()', () => {
        it('calls httpClient.post with paths array', async () => {
            mockHttpClient.post.mockResolvedValue({ deleted_count: 2 })
            await new Storage(mockClient).from('documents').delete(['file1.pdf', 'file2.pdf']).execute()
            expect(mockHttpClient.post).toHaveBeenCalledWith(
                expect.stringContaining('/batch-delete/'),
                { paths: ['file1.pdf', 'file2.pdf'] }
            )
        })
    })

    describe('update()', () => {
        it('calls httpClient.put with path and body', async () => {
            const body = { visibility: 'public', metadata: { category: 'reports' } }
            mockHttpClient.put.mockResolvedValue({ id: 1 })
            await new Storage(mockClient).from('documents').update('file.pdf', body).execute()
            expect(mockHttpClient.put).toHaveBeenCalledWith(
                expect.stringContaining('file.pdf'),
                body
            )
        })
    })

    describe('execute()', () => {
        it('throws error without bucket name', async () => {
            await expect(new Storage(mockClient).execute()).rejects.toThrow('Bucket is required')
        })

        it('calls httpClient.get for list query', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Storage(mockClient).from('documents').execute()
            expect(mockHttpClient.get).toHaveBeenCalled()
        })
    })

    describe('URL building', () => {
        it('builds correct base URL with app slug and bucket', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Storage(mockClient).from('documents').execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith('api/apps/test-app/storage/buckets/documents/objects/', undefined)
        })

        it('builds correct URL for download with encoded path', async () => {
            mockHttpClient.get.mockResolvedValue(new Blob())
            await new Storage(mockClient).from('documents').download('folder/file name.pdf').execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(
                'api/apps/test-app/storage/buckets/documents/objects/folder%2Ffile%20name.pdf/',
                { responseType: 'blob' }
            )
        })

        it('builds correct URL for batch upload', async () => {
            const mockFile = new File([''], 'test.pdf')
            mockHttpClient.post.mockResolvedValue({})
            await new Storage(mockClient).from('documents').upload({
                files: [mockFile],
                metadatas: [{}],
                paths: ['test.pdf']
            }).execute()
            expect(mockHttpClient.post).toHaveBeenCalledWith(
                'api/apps/test-app/storage/buckets/documents/objects/batch-upload/',
                expect.any(FormData)
            )
        })

        it('builds correct URL for batch delete', async () => {
            mockHttpClient.post.mockResolvedValue({})
            await new Storage(mockClient).from('documents').delete(['file.pdf']).execute()
            expect(mockHttpClient.post).toHaveBeenCalledWith(
                'api/apps/test-app/storage/buckets/documents/objects/batch-delete/',
                { paths: ['file.pdf'] }
            )
        })

        it('appends query string with filters', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Storage(mockClient).from('documents').filter({
                search: 'test',
                page: 1,
                ordering: '-created_at'
            }).execute()
            const url = mockHttpClient.get.mock.calls[0][0]
            expect(url).toContain('?')
            expect(url).toContain('search=test')
            expect(url).toContain('page=1')
            expect(url).toContain('ordering=-created_at')
        })
    })

    describe('browse()', () => {
        it('builds correct URL for root browse', async () => {
            mockHttpClient.get.mockResolvedValue({})
            await new Storage(mockClient).from('documents').browse().execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(
                'api/apps/test-app/storage/buckets/documents/objects/browse/',
                undefined
            )
        })

        it('appends prefix and pagination as query params', async () => {
            mockHttpClient.get.mockResolvedValue({})
            await new Storage(mockClient).from('documents').browse({ prefix: 'reports/', page: 2, page_size: 20 }).execute()
            const url = mockHttpClient.get.mock.calls[0][0]
            expect(url).toContain('/browse/')
            expect(url).toContain('prefix=reports%2F')
            expect(url).toContain('page=2')
            expect(url).toContain('page_size=20')
        })

        it('appends sort params as query params', async () => {
            mockHttpClient.get.mockResolvedValue({})
            await new Storage(mockClient).from('documents').browse({ sort: 'name', order: 'asc' }).execute()
            const url = mockHttpClient.get.mock.calls[0][0]
            expect(url).toContain('sort=name')
            expect(url).toContain('order=asc')
        })

        it('does not use blob responseType for browse', async () => {
            mockHttpClient.get.mockResolvedValue({})
            await new Storage(mockClient).from('documents').browse().execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.any(String), undefined)
        })

        it('returns StorageBrowseResponse shape', async () => {
            const mockResponse: StorageBrowseResponse = {
                status: 'success',
                message: 'Directory listed',
                data: {
                    prefix: '',
                    folders: [{ type: 'folder', name: 'reports', path: 'reports/' }],
                    objects: [{ type: 'file', name: 'readme.txt', path: 'readme.txt', id: 1, uuid: 'abc', size: 128, mimetype: 'text/plain', visibility: 'private', is_office_editable: false, created_at: '2024-01-01', updated_at: '2024-01-01', download_url: null }],
                    has_next: false,
                    page: 1,
                    page_size: 50,
                },
            }
            mockHttpClient.get.mockResolvedValue(mockResponse)
            const result = await new Storage(mockClient).from('documents').browse().execute() as StorageBrowseResponse
            expect(result.data.folders).toHaveLength(1)
            expect(result.data.folders[0].type).toBe('folder')
            expect(result.data.folders[0].path).toBe('reports/')
            expect(result.data.objects[0].path).toBe('readme.txt')
            expect(result.data.objects[0].is_office_editable).toBe(false)
            expect(result.data.has_next).toBe(false)
            expect(result.data.page).toBe(1)
        })
    })

    describe('response handling', () => {
        it('returns list response matching StorageListResponse type', async () => {
            const mockResponse: StorageListResponse = {
                status: 'success',
                message: 'Objects retrieved successfully',
                data: [{ id: 1, file: 'doc.pdf', path: 'doc.pdf', size: 1024, mimetype: 'application/pdf', created_at: '2024-01-01', updated_at: '2024-01-01' }],
                total: 1
            }
            mockHttpClient.get.mockResolvedValue(mockResponse)
            const result = await new Storage(mockClient).from('documents').execute() as StorageListResponse
            expect(result.status).toBe('success')
            expect(result.data).toHaveLength(1)
            expect(result.data[0].mimetype).toBe('application/pdf')
            expect(result.total).toBe(1)
        })

        it('returns upload response matching StorageResponse type', async () => {
            const mockResponse: StorageResponse = {
                status: 'success',
                message: 'Object created successfully',
                data: { id: 1, file: 'doc.pdf', path: 'doc.pdf', size: 2048, mimetype: 'application/pdf', created_at: '2024-01-01', updated_at: '2024-01-01' }
            }
            mockHttpClient.post.mockResolvedValue(mockResponse)
            const result = await new Storage(mockClient).from('documents').upload({ files: [], metadatas: [], paths: ['doc.pdf'] }).execute() as StorageResponse
            expect(result.data.file).toBe('doc.pdf')
            expect(result.data.size).toBe(2048)
        })

        it('returns download response as blob', async () => {
            const mockBlob = new Blob(['content'])
            mockHttpClient.get.mockResolvedValue(mockBlob)
            const result = await new Storage(mockClient).from('documents').download('doc.pdf').execute()
            expect(result).toBeInstanceOf(Blob)
        })

        it('returns delete response matching StorageDeleteBatchResponse type', async () => {
            const mockResponse: StorageDeleteBatchResponse = {
                status: 'success',
                message: 'Objects deleted successfully',
                data: { deleted_count: 1, failed: [] }
            }
            mockHttpClient.post.mockResolvedValue(mockResponse)
            const result = await new Storage(mockClient).from('documents').delete(['doc.pdf']).execute() as StorageDeleteBatchResponse
            expect(result.status).toBe('success')
            expect(result.data.deleted_count).toBe(1)
        })

        it('returns update metadata response', async () => {
            const mockResponse: StorageResponse = {
                status: 'success',
                message: 'Object metadata updated successfully',
                data: { id: 1, file: 'doc.pdf', path: 'doc.pdf', size: 1024, mimetype: 'application/pdf', visibility: 'public', created_at: '2024-01-01', updated_at: '2024-01-01' }
            }
            mockHttpClient.put.mockResolvedValue(mockResponse)
            const result = await new Storage(mockClient).from('documents').update('doc.pdf', { visibility: 'public' }).execute() as StorageResponse
            expect(result.data.visibility).toBe('public')
        })
    })
})

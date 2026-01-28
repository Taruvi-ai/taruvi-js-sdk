import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Storage } from '../../../src/lib/storage/StorageClient.js'
import { Client } from '../../../src/client.js'

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
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('search=invoice'))
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
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('created_at__gte=2024-01-01'))
        })

        it('applies mimetype filter', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Storage(mockClient).from('documents').filter({ mimetype: 'application/pdf' }).execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('mimetype=application%2Fpdf'))
        })

        it('applies visibility filter', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Storage(mockClient).from('documents').filter({ visibility: 'public' }).execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('visibility=public'))
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
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('ordering=-created_at'))
        })
    })

    describe('download()', () => {
        it('calls httpClient.get with encoded path', async () => {
            mockHttpClient.get.mockResolvedValue(new Blob())
            await new Storage(mockClient).from('documents').download('path/to/file.pdf').execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('path%2Fto%2Ffile.pdf'))
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
            expect(mockHttpClient.get).toHaveBeenCalledWith('api/apps/test-app/storage/buckets/documents/objects/')
        })

        it('builds correct URL for download with encoded path', async () => {
            mockHttpClient.get.mockResolvedValue(new Blob())
            await new Storage(mockClient).from('documents').download('folder/file name.pdf').execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(
                'api/apps/test-app/storage/buckets/documents/objects/folder%2Ffile%20name.pdf/'
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
})

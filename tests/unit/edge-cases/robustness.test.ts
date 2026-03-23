import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Database } from '../../../src/lib/database/DatabaseClient.js'
import { Storage } from '../../../src/lib/storage/StorageClient.js'
import { Graph } from '../../../src/lib/graphs/GraphClient.js'
import { Client } from '../../../src/client.js'

const mockHttpClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
}

const mockClient = {
    getConfig: () => ({ apiKey: 'test-key', appSlug: 'test-app', apiUrl: 'https://api.test.com' }),
    httpClient: mockHttpClient
} as unknown as Client

describe('Non-JSON / empty / malformed responses', () => {
    beforeEach(() => vi.clearAllMocks())

    it('handles empty response (204 no content)', async () => {
        mockHttpClient.get.mockResolvedValue(undefined)
        const result = await new Database(mockClient).from('accounts').execute()
        expect(result).toBeUndefined()
    })

    it('handles null response body', async () => {
        mockHttpClient.get.mockResolvedValue(null)
        const result = await new Database(mockClient).from('accounts').execute()
        expect(result).toBeNull()
    })

    it('handles empty string response', async () => {
        mockHttpClient.get.mockResolvedValue('')
        const result = await new Database(mockClient).from('accounts').execute()
        expect(result).toBe('')
    })

    it('handles plain text response', async () => {
        mockHttpClient.get.mockResolvedValue('Internal Server Error')
        const result = await new Database(mockClient).from('accounts').execute()
        expect(result).toBe('Internal Server Error')
    })

    it('handles empty array response', async () => {
        mockHttpClient.get.mockResolvedValue([])
        const result = await new Database(mockClient).from('accounts').execute()
        expect(result).toEqual([])
    })

    it('handles empty object response', async () => {
        mockHttpClient.get.mockResolvedValue({})
        const result = await new Database(mockClient).from('accounts').execute()
        expect(result).toEqual({})
    })

    it('propagates network error from httpClient', async () => {
        mockHttpClient.get.mockRejectedValue(new Error('Network Error'))
        await expect(new Database(mockClient).from('accounts').execute()).rejects.toThrow('Network Error')
    })

    it('propagates network error for Graph', async () => {
        mockHttpClient.get.mockRejectedValue(new Error('ECONNREFUSED'))
        await expect(new Graph(mockClient).from('employees').execute()).rejects.toThrow('ECONNREFUSED')
    })

    it('propagates network error for Storage', async () => {
        mockHttpClient.get.mockRejectedValue(new Error('timeout'))
        await expect(new Storage(mockClient).from('documents').execute()).rejects.toThrow('timeout')
    })

    it('handles response with unexpected shape', async () => {
        mockHttpClient.get.mockResolvedValue(42)
        const result = await new Database(mockClient).from('accounts').execute()
        expect(result).toBe(42)
    })

    it('handles response with extra unknown fields', async () => {
        mockHttpClient.get.mockResolvedValue({ status: 'success', data: [], unknown_field: true, nested: { deep: 1 } })
        const result = await new Database(mockClient).from('accounts').execute()
        expect((result as any).unknown_field).toBe(true)
    })
})

describe('Encoding edge cases', () => {
    beforeEach(() => vi.clearAllMocks())

    it('encodes special characters in table name', async () => {
        mockHttpClient.get.mockResolvedValue([])
        await new Database(mockClient).from('my-table_v2').execute()
        expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('/datatables/my-table_v2/'))
    })

    it('encodes special characters in record ID', async () => {
        mockHttpClient.get.mockResolvedValue({})
        await new Database(mockClient).from('accounts').get('abc-123-def').execute()
        expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('/abc-123-def/'))
    })

    it('encodes filter value with spaces', async () => {
        mockHttpClient.get.mockResolvedValue([])
        await new Database(mockClient).from('accounts').filter('name', 'eq', 'John Doe').execute()
        expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('name=John+Doe'))
    })

    it('encodes filter value with special characters', async () => {
        mockHttpClient.get.mockResolvedValue([])
        await new Database(mockClient).from('accounts').filter('email', 'eq', 'user@example.com').execute()
        expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('email=user%40example.com'))
    })

    it('encodes filter value with ampersand', async () => {
        mockHttpClient.get.mockResolvedValue([])
        await new Database(mockClient).from('accounts').filter('company', 'eq', 'A&B Corp').execute()
        const url = mockHttpClient.get.mock.calls[0][0]
        expect(url).toContain('company=A%26B')
    })

    it('handles unicode in filter values', async () => {
        mockHttpClient.get.mockResolvedValue([])
        await new Database(mockClient).from('accounts').filter('name', 'icontains', '日本語').execute()
        expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('name__icontains='))
    })

    it('encodes graph relationship types with special chars', async () => {
        mockHttpClient.get.mockResolvedValue([])
        await new Graph(mockClient).from('employees').types(['reports_to']).execute()
        expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('relationship_type=reports_to'))
    })

    it('handles storage bucket with hyphens', async () => {
        mockHttpClient.get.mockResolvedValue([])
        await new Storage(mockClient).from('my-bucket-name').execute()
        expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('/buckets/my-bucket-name/'))
    })

    it('handles empty string filter value', async () => {
        mockHttpClient.get.mockResolvedValue([])
        await new Database(mockClient).from('accounts').filter('status', 'eq', '').execute()
        const url = mockHttpClient.get.mock.calls[0][0]
        expect(url).toContain('status=')
    })
})

describe('Builder immutability', () => {
    beforeEach(() => vi.clearAllMocks())

    it('Database: chaining does not mutate original instance', async () => {
        mockHttpClient.get.mockResolvedValue([])
        const base = new Database(mockClient).from('accounts')
        const filtered = base.filter('status', 'eq', 'active')
        const sorted = base.sort('name', 'asc')

        await filtered.execute()
        const filteredUrl = mockHttpClient.get.mock.calls[0][0]

        await sorted.execute()
        const sortedUrl = mockHttpClient.get.mock.calls[1][0]

        expect(filteredUrl).toContain('status=active')
        expect(filteredUrl).not.toContain('ordering=name')

        expect(sortedUrl).toContain('ordering=name')
        expect(sortedUrl).not.toContain('status=active')
    })

    it('Database: page does not affect sibling chain', async () => {
        mockHttpClient.get.mockResolvedValue([])
        const base = new Database(mockClient).from('accounts')
        const page1 = base.page(1)
        const page2 = base.page(2)

        await page1.execute()
        await page2.execute()

        expect(mockHttpClient.get.mock.calls[0][0]).toContain('page=1')
        expect(mockHttpClient.get.mock.calls[1][0]).toContain('page=2')
        expect(mockHttpClient.get.mock.calls[0][0]).not.toContain('page=2')
    })

    it('Graph: chaining does not mutate original instance', async () => {
        mockHttpClient.get.mockResolvedValue([])
        const base = new Graph(mockClient).from('employees')
        const descendants = base.get('1').include('descendants').depth(3)
        const ancestors = base.get('4').include('ancestors')

        await descendants.execute()
        const descUrl = mockHttpClient.get.mock.calls[0][0]

        await ancestors.execute()
        const ancUrl = mockHttpClient.get.mock.calls[1][0]

        expect(descUrl).toContain('/1/')
        expect(descUrl).toContain('include=descendants')
        expect(descUrl).toContain('depth=3')

        expect(ancUrl).toContain('/4/')
        expect(ancUrl).toContain('include=ancestors')
        expect(ancUrl).not.toContain('depth=3')
    })

    it('Graph: format does not leak between chains', async () => {
        mockHttpClient.get.mockResolvedValue([])
        const base = new Graph(mockClient).from('employees')
        const tree = base.format('tree')
        const graph = base.format('graph')

        await tree.execute()
        await graph.execute()

        expect(mockHttpClient.get.mock.calls[0][0]).toContain('format=tree')
        expect(mockHttpClient.get.mock.calls[0][0]).not.toContain('format=graph')
        expect(mockHttpClient.get.mock.calls[1][0]).toContain('format=graph')
        expect(mockHttpClient.get.mock.calls[1][0]).not.toContain('format=tree')
    })

    it('Storage: filter does not mutate original instance', async () => {
        mockHttpClient.get.mockResolvedValue([])
        const base = new Storage(mockClient).from('documents')
        const pdfs = base.filter({ mimetype: 'application/pdf' })
        const images = base.filter({ mimetype_category: 'image' })

        await pdfs.execute()
        await images.execute()

        expect(mockHttpClient.get.mock.calls[0][0]).toContain('mimetype=application')
        expect(mockHttpClient.get.mock.calls[0][0]).not.toContain('mimetype_category')
        expect(mockHttpClient.get.mock.calls[1][0]).toContain('mimetype_category=image')
    })

    it('Database: get does not affect list chain', async () => {
        mockHttpClient.get.mockResolvedValue([])
        const base = new Database(mockClient).from('accounts')
        const single = base.get('123')
        const list = base.page(1)

        await single.execute()
        await list.execute()

        expect(mockHttpClient.get.mock.calls[0][0]).toContain('/123/')
        expect(mockHttpClient.get.mock.calls[1][0]).not.toContain('/123/')
    })

    it('Graph: edge operations do not affect traversal chain', async () => {
        mockHttpClient.get.mockResolvedValue([])
        mockHttpClient.post.mockResolvedValue({})
        const base = new Graph(mockClient).from('employees')
        const traversal = base.get('1').include('descendants')
        const edge = base.create([{ from: 1, to: 2, type: 'manager' }])

        await traversal.execute()
        await edge.execute()

        expect(mockHttpClient.get.mock.calls[0][0]).toContain('/data/1/')
        expect(mockHttpClient.post.mock.calls[0][0]).toContain('_edges/data/')
    })
})

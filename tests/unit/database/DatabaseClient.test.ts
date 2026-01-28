import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Database } from '../../../src/lib/database/DatabaseClient.js'
import { Client } from '../../../src/client.js'

// Mock the Client
const mockHttpClient = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
}

const mockClient = {
    getConfig: () => ({ apiKey: 'test-key', appSlug: 'test-app', apiUrl: 'https://api.test.com' }),
    httpClient: mockHttpClient
} as unknown as Client

describe('Database', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('from()', () => {
        it('returns new Database instance with table name', () => {
            const db = new Database(mockClient)
            const result = db.from('accounts')
            expect(result).toBeInstanceOf(Database)
        })
    })

    describe('filter()', () => {
        it('eq operator uses field name without suffix', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('accounts').filter('status', 'eq', 'active').execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('status=active'))
        })

        it('gt operator appends __gt suffix', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('accounts').filter('age', 'gt', 18).execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('age__gt=18'))
        })

        it('gte operator appends __gte suffix', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('accounts').filter('age', 'gte', 18).execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('age__gte=18'))
        })

        it('lt operator appends __lt suffix', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('accounts').filter('age', 'lt', 65).execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('age__lt=65'))
        })

        it('lte operator appends __lte suffix', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('accounts').filter('age', 'lte', 65).execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('age__lte=65'))
        })

        it('icontains operator appends __icontains suffix', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('accounts').filter('name', 'icontains', 'john').execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('name__icontains=john'))
        })

        it('in operator joins array values with comma', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('accounts').filter('status', 'in', ['active', 'pending']).execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('status__in=active%2Cpending'))
        })

        it('isnull operator appends __isnull suffix', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('accounts').filter('deleted_at', 'isnull', true).execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('deleted_at__isnull=true'))
        })

        it('multiple filters chain correctly', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient)
                .from('accounts')
                .filter('status', 'eq', 'active')
                .filter('age', 'gte', 18)
                .execute()
            const url = mockHttpClient.get.mock.calls[0][0]
            expect(url).toContain('status=active')
            expect(url).toContain('age__gte=18')
        })
    })

    describe('sort()', () => {
        it('asc order uses field name without prefix', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('accounts').sort('created_at', 'asc').execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('ordering=created_at'))
        })

        it('desc order adds - prefix', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('accounts').sort('created_at', 'desc').execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('ordering=-created_at'))
        })

        it('defaults to asc when order not specified', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('accounts').sort('name').execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringMatching(/ordering=name(?!-)/))
        })
    })

    describe('pagination', () => {
        it('page() sets page number', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('accounts').page(2).execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('page=2'))
        })

        it('pageSize() sets page_size', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('accounts').pageSize(20).execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('page_size=20'))
        })
    })

    describe('populate()', () => {
        it('joins array with comma', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('orders').populate(['customer', 'items']).execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('populate=customer%2Citems'))
        })
    })

    describe('CRUD operations', () => {
        it('get() calls httpClient.get with record ID in URL', async () => {
            mockHttpClient.get.mockResolvedValue({ id: '123' })
            await new Database(mockClient).from('accounts').get('123').execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('/123/'))
        })

        it('create() calls httpClient.post with body', async () => {
            const body = { name: 'Test', status: 'active' }
            mockHttpClient.post.mockResolvedValue({ id: '1', ...body })
            await new Database(mockClient).from('accounts').create(body).execute()
            expect(mockHttpClient.post).toHaveBeenCalledWith(expect.any(String), body)
        })

        it('update() calls httpClient.patch with body', async () => {
            const body = { status: 'inactive' }
            mockHttpClient.patch.mockResolvedValue({ id: '123', ...body })
            await new Database(mockClient).from('accounts').get('123').update(body).execute()
            expect(mockHttpClient.patch).toHaveBeenCalledWith(expect.stringContaining('/123/'), body)
        })

        it('update() without recordId throws error', async () => {
            const body = { status: 'inactive' }
            await expect(
                new Database(mockClient).from('accounts').update(body).execute()
            ).rejects.toThrow('PATCH operation requires a record ID')
        })

        it('delete() calls httpClient.delete', async () => {
            mockHttpClient.delete.mockResolvedValue({})
            await new Database(mockClient).from('accounts').delete('123').execute()
            expect(mockHttpClient.delete).toHaveBeenCalledWith(expect.stringContaining('/123/'))
        })
    })

    describe('execute()', () => {
        it('throws error without table name', async () => {
            await expect(new Database(mockClient).execute()).rejects.toThrow('Table name is required')
        })

        it('calls httpClient.get for list query', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('accounts').execute()
            expect(mockHttpClient.get).toHaveBeenCalled()
        })
    })

    describe('first()', () => {
        it('returns first item from array', async () => {
            mockHttpClient.get.mockResolvedValue([{ id: '1' }, { id: '2' }])
            const result = await new Database(mockClient).from('accounts').first()
            expect(result).toEqual({ id: '1' })
        })

        it('returns null for empty array', async () => {
            mockHttpClient.get.mockResolvedValue([])
            const result = await new Database(mockClient).from('accounts').first()
            expect(result).toBeNull()
        })

        it('returns single item if not array', async () => {
            mockHttpClient.get.mockResolvedValue({ id: '1' })
            const result = await new Database(mockClient).from('accounts').get('1').first()
            expect(result).toEqual({ id: '1' })
        })
    })

    describe('count()', () => {
        it('returns array length', async () => {
            mockHttpClient.get.mockResolvedValue([{ id: '1' }, { id: '2' }, { id: '3' }])
            const result = await new Database(mockClient).from('accounts').count()
            expect(result).toBe(3)
        })

        it('returns 0 for non-array', async () => {
            mockHttpClient.get.mockResolvedValue({ id: '1' })
            const result = await new Database(mockClient).from('accounts').get('1').count()
            expect(result).toBe(0)
        })
    })

    describe('URL building', () => {
        it('builds correct base URL with app slug and table', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('accounts').execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith('api/apps/test-app/datatables/accounts/data/')
        })

        it('builds correct URL with record ID', async () => {
            mockHttpClient.get.mockResolvedValue({})
            await new Database(mockClient).from('accounts').get('abc-123').execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith('api/apps/test-app/datatables/accounts/data/abc-123/')
        })

        it('appends query string with filters', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient)
                .from('accounts')
                .filter('status', 'eq', 'active')
                .page(1)
                .pageSize(10)
                .execute()
            const url = mockHttpClient.get.mock.calls[0][0]
            expect(url).toContain('?')
            expect(url).toContain('status=active')
            expect(url).toContain('page=1')
            expect(url).toContain('page_size=10')
        })
    })
})

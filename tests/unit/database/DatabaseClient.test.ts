import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Database } from '../../../src/lib/database/DatabaseClient.js'
import { Client } from '../../../src/client.js'
import type { BackendFilterTreeRoot, DatabaseResponse, DatabaseSingleResponse, EdgeResponse } from '../../../src/lib/database/types.js'
import type { TaruviResponse } from '../../../src/types.js'

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

    describe('filters() flat (triple-arg)', () => {
        it('eq operator uses field name without suffix', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('accounts').filters('status', 'eq', 'active').execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('status=active'))
        })

        it('gt operator appends __gt suffix', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('accounts').filters('age', 'gt', 18).execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('age__gt=18'))
        })

        it('gte operator appends __gte suffix', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('accounts').filters('age', 'gte', 18).execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('age__gte=18'))
        })

        it('lt operator appends __lt suffix', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('accounts').filters('age', 'lt', 65).execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('age__lt=65'))
        })

        it('lte operator appends __lte suffix', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('accounts').filters('age', 'lte', 65).execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('age__lte=65'))
        })

        it('icontains operator appends __icontains suffix', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('accounts').filters('name', 'icontains', 'john').execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('name__icontains=john'))
        })

        it('in operator joins array values with comma', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('accounts').filters('status', 'in', ['active', 'pending']).execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('status__in=active%2Cpending'))
        })

        it('null operator appends __null suffix', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('accounts').filters('deleted_at', 'null', true).execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('deleted_at__null=true'))
        })

        it('multiple filters chain correctly', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient)
                .from('accounts')
                .filters('status', 'eq', 'active')
                .filters('age', 'gte', 18)
                .execute()
            const url = mockHttpClient.get.mock.calls[0][0]
            expect(url).toContain('status=active')
            expect(url).toContain('age__gte=18')
        })
    })

    describe('filters() JSON tree', () => {
        const normativeTree: BackendFilterTreeRoot = [
            {
                operator: 'and',
                value: [
                    { field: 'is_active', operator: 'eq', value: true },
                    { field: 'hire_date', operator: 'lt', value: '2021-01-01' },
                    {
                        operator: 'or',
                        value: [
                            { field: 'salary', operator: 'gte', value: 200000 },
                            {
                                operator: 'and',
                                value: [
                                    { field: 'title', operator: 'containss', value: 'VP' },
                                    { field: 'bonus', operator: 'gte', value: 50000 },
                                ],
                            },
                        ],
                    },
                ],
            },
        ]

        it('serializes tree into filters query param (round-trip)', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('accounts').filters(normativeTree).execute()
            const url = mockHttpClient.get.mock.calls[0][0] as string
            const q = url.includes('?') ? url.split('?')[1] : ''
            const params = new URLSearchParams(q)
            const raw = params.get('filters')
            expect(raw).toBeTruthy()
            expect(JSON.parse(decodeURIComponent(raw!))).toEqual(normativeTree)
        })

        it('chains JSON filters with populate', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient)
                .from('accounts')
                .filters(normativeTree)
                .populate(['customer'])
                .execute()
            const url = mockHttpClient.get.mock.calls[0][0] as string
            expect(url).toContain('populate=customer')
            const q = url.split('?')[1]
            expect(new URLSearchParams(q).get('filters')).toBeTruthy()
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

        it('comma-joins multiple fields from array (mixed asc/desc)', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient)
                .from('accounts')
                .sort([
                    { field: 'salary', order: 'desc' },
                    { field: 'hire_date', order: 'asc' },
                ])
                .execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(
                expect.stringContaining('ordering=-salary%2Chire_date')
            )
        })

        it('accepts pre-built ordering string', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('accounts').sort('-a,b').execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('ordering=-a%2Cb'))
        })

        it('chains with filters without dropping ordering', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient)
                .from('accounts')
                .filters('status', 'eq', 'active')
                .sort([{ field: 'name', order: 'asc' }])
                .execute()
            const url = mockHttpClient.get.mock.calls[0][0] as string
            expect(url).toContain('status=active')
            expect(url).toContain('ordering=name')
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

        it('populateAll sets wildcard populate', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('orders').populateAll().execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('populate=*'))
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
            mockHttpClient.get.mockResolvedValue({ data: [{ id: '1' }, { id: '2' }] })
            const result = await new Database(mockClient).from('accounts').first()
            expect(result).toEqual({ id: '1' })
        })

        it('returns null for empty array', async () => {
            mockHttpClient.get.mockResolvedValue({ data: [] })
            const result = await new Database(mockClient).from('accounts').first()
            expect(result).toBeNull()
        })

        it('returns single item if not array', async () => {
            mockHttpClient.get.mockResolvedValue({ data: { id: '1' } })
            const result = await new Database(mockClient).from('accounts').get('1').first()
            expect(result).toEqual({ id: '1' })
        })

        it('requests one row for a list read', async () => {
            mockHttpClient.get.mockResolvedValue({ data: [{ id: '1' }] })
            await new Database(mockClient).from('accounts').filters('status', 'eq', 'open').first()
            const url = mockHttpClient.get.mock.calls[0][0] as string
            expect(url).toContain('page_size=1')
            expect(url).toContain('status=open')
        })

        it('does not add page_size to a single-record read', async () => {
            mockHttpClient.get.mockResolvedValue({ data: { id: '1' } })
            await new Database(mockClient).from('accounts').get('1').first()
            const url = mockHttpClient.get.mock.calls[0][0] as string
            expect(url).not.toContain('page_size')
        })
    })

    describe('count() request', () => {
        it('asks for one row so the platform returns the total without every record', async () => {
            mockHttpClient.get.mockResolvedValue({ data: [{ id: '1' }], total: 42 })
            const total = await new Database(mockClient).from('accounts').filters('status', 'eq', 'open').count()
            expect(total).toBe(42)
            expect(mockHttpClient.get.mock.calls[0][0]).toContain('page_size=1')
        })
    })

    describe('count()', () => {
        it('returns array length', async () => {
            mockHttpClient.get.mockResolvedValue({ data: [{ id: '1' }, { id: '2' }, { id: '3' }] })
            const result = await new Database(mockClient).from('accounts').count()
            expect(result).toBe(3)
        })

        it('returns 0 for non-array', async () => {
            mockHttpClient.get.mockResolvedValue({ data: { id: '1' } })
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
                .filters('status', 'eq', 'active')
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

    describe('response handling', () => {
        it('returns list response matching DatabaseResponse type', async () => {
            const mockResponse: DatabaseResponse = {
                status: 'success',
                message: 'Data retrieved successfully',
                data: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
                total: 2,
                pagination: { offset: 0, limit: 20, count: 2, current_page: 1, total_pages: 1, has_next: false, has_previous: false }
            }
            mockHttpClient.get.mockResolvedValue(mockResponse)
            const result = await new Database(mockClient).from('accounts').execute() as DatabaseResponse
            expect(result.status).toBe('success')
            expect(result.data).toHaveLength(2)
            expect(result.total).toBe(2)
            expect(result.pagination!.current_page).toBe(1)
        })

        it('returns single record matching DatabaseSingleResponse type', async () => {
            const mockResponse: DatabaseSingleResponse = {
                status: 'success',
                message: 'Record retrieved successfully',
                data: { id: 1, name: 'Alice', email: 'alice@example.com' }
            }
            mockHttpClient.get.mockResolvedValue(mockResponse)
            const result = await new Database(mockClient).from('accounts').get('1').execute() as DatabaseSingleResponse
            expect(result.data.id).toBe(1)
            expect(result.data.name).toBe('Alice')
        })

        it('returns created record response', async () => {
            const mockResponse: DatabaseSingleResponse = {
                status: 'success',
                message: 'Record created successfully',
                data: { id: 3, name: 'Carol', status: 'active' }
            }
            mockHttpClient.post.mockResolvedValue(mockResponse)
            const result = await new Database(mockClient).from('accounts').create({ name: 'Carol', status: 'active' }).execute() as DatabaseSingleResponse
            expect(result.data.id).toBe(3)
        })

        it('returns updated record response', async () => {
            const mockResponse: DatabaseSingleResponse = {
                status: 'success',
                message: 'Record updated successfully',
                data: { id: 1, name: 'Alice Updated' }
            }
            mockHttpClient.patch.mockResolvedValue(mockResponse)
            const result = await new Database(mockClient).from('accounts').get('1').update({ name: 'Alice Updated' }).execute() as DatabaseSingleResponse
            expect(result.data.name).toBe('Alice Updated')
        })

        it('returns delete response', async () => {
            const mockResponse = { status: 'success', message: 'Record deleted successfully' }
            mockHttpClient.delete.mockResolvedValue(mockResponse)
            const result = await new Database(mockClient).from('accounts').delete('1').execute()
            expect((result as any).status).toBe('success')
        })
    })

    describe('graph traversal', () => {
        it('include() sets include param', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('employees').get('1').include('descendants').execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('include=descendants'))
        })

        it('include() supports ancestors', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('employees').get('4').include('ancestors').execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('include=ancestors'))
        })

        it('include() supports both', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('employees').get('2').include('both').execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('include=both'))
        })

        it('depth() sets depth param', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('employees').get('1').include('descendants').depth(3).execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('depth=3'))
        })

        it('format() sets format param to tree', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('employees').get('1').format('tree').depth(3).execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('format=tree'))
        })

        it('format() sets format param to graph', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('employees').format('graph').execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('format=graph'))
        })

        it('types() sets relationship_type as repeated params', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('employees').format('graph').types(['manager', 'dotted_line']).execute()
            const url = mockHttpClient.get.mock.calls[0][0]
            expect(url).toContain('relationship_type=manager')
            expect(url).toContain('relationship_type=dotted_line')
        })

        it('types() with single type', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('employees').format('graph').types(['manager']).execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('relationship_type=manager'))
        })

        it('combines include, depth, and get', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('employees').get('1').include('descendants').depth(3).execute()
            const url = mockHttpClient.get.mock.calls[0][0]
            expect(url).toContain('/1/')
            expect(url).toContain('include=descendants')
            expect(url).toContain('depth=3')
        })

        it('combines format, types, and depth', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Database(mockClient).from('employees').format('graph').types(['manager']).depth(2).execute()
            const url = mockHttpClient.get.mock.calls[0][0]
            expect(url).toContain('format=graph')
            expect(url).toContain('relationship_type=manager')
            expect(url).toContain('depth=2')
        })
    })

    describe('graph response handling', () => {
        it('returns descendants response', async () => {
            const mockResponse = {
                status: 'success',
                data: {
                    data: { id: 1, name: 'Alice Chen', title: 'CEO' },
                    reports: [
                        { id: 2, name: 'Bob Smith', _depth: 1, _relationship_type: 'manager' },
                        { id: 3, name: 'Carol White', _depth: 1, _relationship_type: 'manager' }
                    ]
                }
            }
            mockHttpClient.get.mockResolvedValue(mockResponse)
            const result = await new Database(mockClient).from('employees').get('1').include('descendants').execute()
            expect((result as any).data.reports).toHaveLength(2)
        })

        it('returns tree format with nested children', async () => {
            const mockResponse = {
                status: 'success',
                data: [{
                    id: 1, name: 'Alice Chen', _depth: 0,
                    children: [
                        { id: 2, name: 'Bob Smith', _depth: 1, children: [] },
                        { id: 3, name: 'Carol White', _depth: 1, children: [] }
                    ]
                }],
                total: 3
            }
            mockHttpClient.get.mockResolvedValue(mockResponse)
            const result = await new Database(mockClient).from('employees').get('1').format('tree').depth(2).execute()
            expect((result as any).data[0].children).toHaveLength(2)
        })

        it('returns graph format with nodes and edges', async () => {
            const mockResponse = {
                status: 'success',
                data: {
                    nodes: [{ id: 1, name: 'Alice Chen' }, { id: 2, name: 'Bob Smith' }],
                    edges: [{ id: 9, from_id: 2, to_id: 1, type: 'manager' }]
                },
                total: 2
            }
            mockHttpClient.get.mockResolvedValue(mockResponse)
            const result = await new Database(mockClient).from('employees').format('graph').types(['manager']).execute()
            expect((result as any).data.nodes).toHaveLength(2)
            expect((result as any).data.edges).toHaveLength(1)
        })
    })

    describe('upsert()', () => {
        it('calls httpClient.post with body to upsert URL', async () => {
            const body = { name: 'Test', status: 'active' }
            mockHttpClient.post.mockResolvedValue({ id: '1', ...body })
            await new Database(mockClient).from('accounts').upsert(body).execute()
            expect(mockHttpClient.post).toHaveBeenCalledWith(
                'api/apps/test-app/datatables/accounts/data/upsert/',
                body
            )
        })

        it('builds correct upsert URL with array body', async () => {
            const body = [{ name: 'A' }, { name: 'B' }]
            mockHttpClient.post.mockResolvedValue({ data: body })
            await new Database(mockClient).from('accounts').upsert(body).execute()
            expect(mockHttpClient.post).toHaveBeenCalledWith(
                'api/apps/test-app/datatables/accounts/data/upsert/',
                body
            )
        })
    })

    describe('bulkUpdate()', () => {
        it('calls httpClient.patch with array body without recordId', async () => {
            const body = [{ id: '1', status: 'inactive' }, { id: '2', status: 'active' }]
            mockHttpClient.patch.mockResolvedValue({ data: body })
            await new Database(mockClient).from('accounts').bulkUpdate(body).execute()
            expect(mockHttpClient.patch).toHaveBeenCalledWith(
                'api/apps/test-app/datatables/accounts/data/',
                body
            )
        })

        it('does not throw without recordId when body is array', async () => {
            const body = [{ id: '1', name: 'Updated' }]
            mockHttpClient.patch.mockResolvedValue({ data: body })
            await expect(
                new Database(mockClient).from('accounts').bulkUpdate(body).execute()
            ).resolves.toBeDefined()
        })
    })

    describe('bulkDelete()', () => {
        it('calls httpClient.delete with ids in query string', async () => {
            mockHttpClient.delete.mockResolvedValue({ status: 'success' })
            await new Database(mockClient).from('accounts').bulkDelete(['1']).execute()
            expect(mockHttpClient.delete).toHaveBeenCalledWith(
                expect.stringContaining('ids=1')
            )
        })

        it('joins multiple ids with comma', async () => {
            mockHttpClient.delete.mockResolvedValue({ status: 'success' })
            await new Database(mockClient).from('accounts').bulkDelete(['1', '2', '3']).execute()
            expect(mockHttpClient.delete).toHaveBeenCalledWith(
                expect.stringContaining('ids=1%2C2%2C3')
            )
        })
    })

    describe('deleteFiltered()', () => {
        it('sends the filters as one ?filter= JSON object', async () => {
            mockHttpClient.delete.mockResolvedValue({ status: 'success' })
            await new Database(mockClient).from('accounts').filters('status', 'eq', 'inactive').filters('age', 'lt', 18).deleteFiltered().execute()
            const url: string = mockHttpClient.delete.mock.calls[0][0]
            const params = new URLSearchParams(url.split('?')[1])
            expect(JSON.parse(params.get('filter') as string)).toEqual({ status: 'inactive', age__lt: 18 })
            expect(url).not.toContain('status=inactive')
            expect(url).not.toContain('/undefined/')
        })

        it('moves a JSON filter tree into the filter object and drops list-only params', async () => {
            mockHttpClient.delete.mockResolvedValue({ status: 'success' })
            const tree = [{ operator: 'or' as const, value: [{ field: 'status', operator: 'eq', value: 'done' }] }]
            await new Database(mockClient).from('tasks').filters(tree).page(2).pageSize(10).deleteFiltered().execute()
            const url: string = mockHttpClient.delete.mock.calls[0][0]
            const filter = JSON.parse(new URLSearchParams(url.split('?')[1]).get('filter') as string)
            expect(filter).toEqual({ filters: JSON.stringify(tree) })
        })

        it('throws before sending a request when no filter is set', () => {
            expect(() => new Database(mockClient).from('accounts').page(1).deleteFiltered()).toThrow('requires at least one filter')
        })

        it('hits collection endpoint without recordId', async () => {
            mockHttpClient.delete.mockResolvedValue({ status: 'success' })
            await new Database(mockClient).from('accounts').filters('age', 'lt', 18).deleteFiltered().execute()
            expect(mockHttpClient.delete).toHaveBeenCalledWith(
                expect.stringContaining('api/apps/test-app/datatables/accounts/data/?')
            )
        })
    })

    describe('edges()', () => {
        it('targets _edges table for list', async () => {
            mockHttpClient.get.mockResolvedValue({ edges: [], total: 0 })
            await new Database(mockClient).from('employees').edges().execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith('api/apps/test-app/datatables/employees_edges/data/')
        })

        it('create() calls POST on edges route', async () => {
            const edges = [
                { from_id: 5, to_id: 2, type: 'manager' },
                { from_id: 5, to_id: 3, type: 'dotted_line', metadata: { project: 'AI' } }
            ]
            mockHttpClient.post.mockResolvedValue({ status: 'success', data: edges, total: 2 })
            await new Database(mockClient).from('employees').edges().create(edges).execute()
            expect(mockHttpClient.post).toHaveBeenCalledWith(
                'api/apps/test-app/datatables/employees_edges/data/',
                edges
            )
        })

        it('update() calls PATCH with edge ID', async () => {
            const edge = { from_id: 5, to_id: 3, type: 'dotted_line' }
            mockHttpClient.patch.mockResolvedValue({ id: 9, ...edge })
            await new Database(mockClient).from('employees').edges().get('9').update(edge).execute()
            expect(mockHttpClient.patch).toHaveBeenCalledWith(
                'api/apps/test-app/datatables/employees_edges/data/9/',
                edge
            )
        })

        it('delete() with edge IDs sends them as ?ids=', async () => {
            mockHttpClient.delete.mockResolvedValue({ deleted: 2 })
            await new Database(mockClient).from('employees').edges().delete([9, 10]).execute()
            expect(mockHttpClient.delete).toHaveBeenCalledWith(
                'api/apps/test-app/datatables/employees_edges/data/?ids=9%2C10'
            )
        })

        it('returns created edges matching EdgeResponse', async () => {
            const mockResponse: TaruviResponse<EdgeResponse[]> = {
                status: 'success',
                message: 'Edges created successfully',
                data: [{ id: 10, from_id: 5, to_id: 2, type: 'manager', metadata: {} }],
                total: 1
            }
            mockHttpClient.post.mockResolvedValue(mockResponse)
            const result = await new Database(mockClient).from('employees').edges().create([{ from_id: 5, to_id: 2, type: 'manager' }]).execute() as TaruviResponse<EdgeResponse[]>
            expect(result.data).toHaveLength(1)
            expect(result.data[0].id).toBe(10)
        })

        it('does not affect non-edge queries', async () => {
            mockHttpClient.get.mockResolvedValue([])
            const base = new Database(mockClient).from('employees')
            await base.edges().execute()
            await base.execute()
            expect(mockHttpClient.get).toHaveBeenNthCalledWith(1, 'api/apps/test-app/datatables/employees_edges/data/')
            expect(mockHttpClient.get).toHaveBeenNthCalledWith(2, 'api/apps/test-app/datatables/employees/data/')
        })
    })
})

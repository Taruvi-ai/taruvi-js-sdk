import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Graph } from '../../../src/lib/graphs/GraphClient.js'
import { Client } from '../../../src/client.js'
import type { EdgeResponse } from '../../../src/lib/graphs/types.js'
import type { TaruviResponse } from '../../../src/types.js'

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

describe('Graph', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('from()', () => {
        it('returns new Graph instance', () => {
            const graph = new Graph(mockClient)
            expect(graph.from('employees')).toBeInstanceOf(Graph)
        })
    })

    describe('traversal query params', () => {
        it('include() sets include param', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Graph(mockClient).from('employees').get('1').include('descendants').execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('include=descendants'))
        })

        it('include() supports ancestors', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Graph(mockClient).from('employees').get('4').include('ancestors').execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('include=ancestors'))
        })

        it('include() supports both', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Graph(mockClient).from('employees').get('2').include('both').execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('include=both'))
        })

        it('depth() sets depth param', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Graph(mockClient).from('employees').get('1').include('descendants').depth(3).execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('depth=3'))
        })

        it('format() sets format param to tree', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Graph(mockClient).from('employees').get('1').format('tree').depth(3).execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('format=tree'))
        })

        it('format() sets format param to graph', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Graph(mockClient).from('employees').format('graph').execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('format=graph'))
        })

        it('types() sets relationship_type as repeated params', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Graph(mockClient).from('employees').format('graph').types(['manager', 'dotted_line']).execute()
            const url = mockHttpClient.get.mock.calls[0][0]
            expect(url).toContain('relationship_type=manager')
            expect(url).toContain('relationship_type=dotted_line')
        })

        it('types() with single type', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Graph(mockClient).from('employees').format('graph').types(['manager']).execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith(expect.stringContaining('relationship_type=manager'))
        })
    })

    describe('chaining', () => {
        it('combines include, depth, and get', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Graph(mockClient).from('employees').get('1').include('descendants').depth(3).execute()
            const url = mockHttpClient.get.mock.calls[0][0]
            expect(url).toContain('/1/')
            expect(url).toContain('include=descendants')
            expect(url).toContain('depth=3')
        })

        it('combines format, types, and depth', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Graph(mockClient).from('employees').format('graph').types(['manager']).depth(2).execute()
            const url = mockHttpClient.get.mock.calls[0][0]
            expect(url).toContain('format=graph')
            expect(url).toContain('relationship_type=manager')
            expect(url).toContain('depth=2')
        })
    })

    describe('URL building', () => {
        it('builds correct base URL for data queries', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Graph(mockClient).from('employees').execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith('api/apps/test-app/datatables/employees/data/')
        })

        it('builds correct URL with record ID', async () => {
            mockHttpClient.get.mockResolvedValue({})
            await new Graph(mockClient).from('employees').get('1').execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith('api/apps/test-app/datatables/employees/data/1/')
        })

        it('appends query string', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Graph(mockClient).from('employees').get('1').include('descendants').depth(2).execute()
            const url = mockHttpClient.get.mock.calls[0][0]
            expect(url).toContain('api/apps/test-app/datatables/employees/data/1/')
            expect(url).toContain('?')
        })
    })

    describe('edge CRUD', () => {
        it('listEdges() calls GET on edges route', async () => {
            mockHttpClient.get.mockResolvedValue({ edges: [], total: 0 })
            await new Graph(mockClient).from('employees').listEdges().execute()
            expect(mockHttpClient.get).toHaveBeenCalledWith('api/apps/test-app/datatables/employees/edges/')
        })

        it('createEdge() calls POST with array of edges', async () => {
            const edges = [
                { from: 5, to: 2, type: 'manager' },
                { from: 5, to: 3, type: 'dotted_line', metadata: { project: 'AI' } }
            ]
            mockHttpClient.post.mockResolvedValue({ status: 'success', data: edges, total: 2 })
            await new Graph(mockClient).from('employees').createEdge(edges).execute()
            expect(mockHttpClient.post).toHaveBeenCalledWith(
                'api/apps/test-app/datatables/employees/edges/',
                edges
            )
        })

        it('createEdge() with metadata', async () => {
            const edges = [{ from: 5, to: 3, type: 'dotted_line', metadata: { percentage: 30 } }]
            mockHttpClient.post.mockResolvedValue({ status: 'success', data: edges, total: 1 })
            await new Graph(mockClient).from('employees').createEdge(edges).execute()
            expect(mockHttpClient.post).toHaveBeenCalledWith(
                'api/apps/test-app/datatables/employees/edges/',
                edges
            )
        })

        it('updateEdge() calls PATCH with edge ID in URL', async () => {
            const edge = { from: 5, to: 3, type: 'dotted_line' }
            mockHttpClient.patch.mockResolvedValue({ id: 9, ...edge })
            await new Graph(mockClient).from('employees').updateEdge('9', edge).execute()
            expect(mockHttpClient.patch).toHaveBeenCalledWith(
                'api/apps/test-app/datatables/employees/edges/9/',
                edge
            )
        })

        it('deleteEdge() calls DELETE with edge_ids object', async () => {
            mockHttpClient.delete.mockResolvedValue({ deleted: 2 })
            await new Graph(mockClient).from('employees').deleteEdge([9, 10]).execute()
            expect(mockHttpClient.delete).toHaveBeenCalledWith(
                'api/apps/test-app/datatables/employees/edges/',
                { edge_ids: [9, 10] }
            )
        })
    })

    describe('execute()', () => {
        it('defaults to GET for traversal queries', async () => {
            mockHttpClient.get.mockResolvedValue([])
            await new Graph(mockClient).from('employees').execute()
            expect(mockHttpClient.get).toHaveBeenCalled()
            expect(mockHttpClient.post).not.toHaveBeenCalled()
        })
    })

    describe('response handling', () => {
        it('returns descendants response with base record and related records', async () => {
            const mockResponse = {
                status: 'success',
                message: 'Data retrieved successfully',
                data: {
                    data: { id: 1, name: 'Alice Chen', title: 'CEO' },
                    reports: [
                        { id: 2, name: 'Bob Smith', _depth: 1, _relationship_type: 'manager' },
                        { id: 3, name: 'Carol White', _depth: 1, _relationship_type: 'manager' }
                    ]
                }
            }
            mockHttpClient.get.mockResolvedValue(mockResponse)
            const result = await new Graph(mockClient).from('employees').get('1').include('descendants').execute()
            expect(result).toEqual(mockResponse)
            expect((result as any).data.data.id).toBe(1)
            expect((result as any).data.reports).toHaveLength(2)
            expect((result as any).data.reports[0]._depth).toBe(1)
            expect((result as any).data.reports[0]._relationship_type).toBe('manager')
        })

        it('returns ancestors response with manager chain', async () => {
            const mockResponse = {
                status: 'success',
                message: 'Data retrieved successfully',
                data: {
                    data: { id: 4, name: 'David Lee' },
                    manager: [
                        { id: 2, name: 'Bob Smith', _depth: 1, _relationship_type: 'manager' },
                        { id: 1, name: 'Alice Chen', _depth: 2, _relationship_type: 'manager' }
                    ]
                }
            }
            mockHttpClient.get.mockResolvedValue(mockResponse)
            const result = await new Graph(mockClient).from('employees').get('4').include('ancestors').execute()
            expect((result as any).data.manager).toHaveLength(2)
            expect((result as any).data.manager[1]._depth).toBe(2)
        })

        it('returns both directions response', async () => {
            const mockResponse = {
                status: 'success',
                message: 'Data retrieved successfully',
                data: {
                    data: { id: 2, name: 'Bob Smith' },
                    manager: [{ id: 1, name: 'Alice Chen', _depth: 1, _relationship_type: 'manager' }],
                    reports: [{ id: 4, name: 'David Lee', _depth: 1, _relationship_type: 'manager' }]
                }
            }
            mockHttpClient.get.mockResolvedValue(mockResponse)
            const result = await new Graph(mockClient).from('employees').get('2').include('both').depth(1).execute()
            expect((result as any).data.manager).toHaveLength(1)
            expect((result as any).data.reports).toHaveLength(1)
        })

        it('returns tree format with nested children', async () => {
            const mockResponse = {
                status: 'success',
                message: 'Tree data retrieved successfully',
                data: [{
                    id: 1,
                    name: 'Alice Chen',
                    _depth: 0,
                    children: [
                        { id: 2, name: 'Bob Smith', _depth: 1, _relationship_type: 'manager', children: [] },
                        { id: 3, name: 'Carol White', _depth: 1, _relationship_type: 'manager', children: [] }
                    ]
                }],
                total: 3
            }
            mockHttpClient.get.mockResolvedValue(mockResponse)
            const result = await new Graph(mockClient).from('employees').get('1').format('tree').depth(2).execute()
            expect((result as any).data[0].children).toHaveLength(2)
            expect((result as any).data[0].children[0]._relationship_type).toBe('manager')
            expect((result as any).total).toBe(3)
        })

        it('returns graph format with nodes and edges', async () => {
            const mockResponse = {
                status: 'success',
                message: 'Graph data retrieved successfully',
                data: {
                    nodes: [
                        { id: 1, name: 'Alice Chen', title: 'CEO' },
                        { id: 2, name: 'Bob Smith', title: 'VP Engineering' }
                    ],
                    edges: [
                        { id: 9, from: 2, to: 1, type: 'manager', metadata: { primary: true } }
                    ]
                },
                total: 2
            }
            mockHttpClient.get.mockResolvedValue(mockResponse)
            const result = await new Graph(mockClient).from('employees').format('graph').types(['manager']).execute()
            expect((result as any).data.nodes).toHaveLength(2)
            expect((result as any).data.edges).toHaveLength(1)
            expect((result as any).data.edges[0].type).toBe('manager')
        })

        it('returns edge list response', async () => {
            const mockResponse = {
                edges: [
                    { id: 1, from: 5, to: 2, type: 'manager', metadata: {} },
                    { id: 2, from: 5, to: 3, type: 'dotted_line', metadata: { percentage: 30 } }
                ],
                total: 2
            }
            mockHttpClient.get.mockResolvedValue(mockResponse)
            const result = await new Graph(mockClient).from('employees').listEdges().execute()
            expect((result as any).edges).toHaveLength(2)
            expect((result as any).edges[0].type).toBe('manager')
            expect((result as any).total).toBe(2)
        })

        it('returns created edges response matching TaruviResponse<EdgeResponse[]>', async () => {
            const mockResponse: TaruviResponse<EdgeResponse[]> = {
                status: 'success',
                message: 'Edges created successfully',
                data: [
                    { id: 10, from: 5, to: 2, type: 'manager', metadata: {} }
                ],
                total: 1
            }
            mockHttpClient.post.mockResolvedValue(mockResponse)
            const result = await new Graph(mockClient).from('employees').createEdge([{ from: 5, to: 2, type: 'manager' }]).execute() as TaruviResponse<EdgeResponse[]>
            expect(result.data).toHaveLength(1)
            expect(result.data[0].id).toBe(10)
        })

        it('returns updated edge matching EdgeResponse type', async () => {
            const mockResponse: EdgeResponse = { id: 9, from: 5, to: 3, type: 'dotted_line', metadata: {} }
            mockHttpClient.patch.mockResolvedValue(mockResponse)
            const result = await new Graph(mockClient).from('employees').updateEdge('9', { from: 5, to: 3, type: 'dotted_line' }).execute() as EdgeResponse
            expect(result.id).toBe(9)
            expect(result.type).toBe('dotted_line')
        })

        it('returns delete count response', async () => {
            const mockResponse = { deleted: 3 }
            mockHttpClient.delete.mockResolvedValue(mockResponse)
            const result = await new Graph(mockClient).from('employees').deleteEdge([1, 2, 3]).execute()
            expect((result as any).deleted).toBe(3)
        })
    })
})

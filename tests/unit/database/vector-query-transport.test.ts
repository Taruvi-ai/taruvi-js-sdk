import type { AxiosInstance } from 'axios'
import { describe, expect, it } from 'vitest'
import { Client, Database } from '../../../src/index.js'
import type { BackendFilterTreeRoot, FilterOperator } from '../../../src/index.js'

function recordingClient() {
    const client = new Client({ apiUrl: 'https://sdk.test', appSlug: 'app', authMode: 'apiKey', apiKey: 'fixture-key' })
    const requests: Array<{ method: string; url: URL; body: Record<string, unknown> | undefined }> = []
    const http = client.httpClient as unknown as { axiosInstance: AxiosInstance }
    http.axiosInstance.defaults.adapter = async config => {
        requests.push({
            method: config.method!.toUpperCase(),
            url: new URL(config.url!, config.baseURL),
            body: config.data === undefined ? undefined : JSON.parse(config.data),
        })
        return { status: 200, statusText: 'OK', headers: {}, config, data: { data: [], total: 0 } }
    }
    return { query: new Database(client).from('items'), requests }
}

describe('vector query transport', () => {
    it.each<[FilterOperator, Array<string | number | boolean>]>([
        ['between', [1, 3]],
        ['nbetween', [1, 3]],
        ['in', [1, 3]],
        ['in', []],
        ['rcontains', [1, 3]],
        ['acontains', ['a,b', 'c']],
    ])('keeps %s filter arrays in the POST JSON', async (operator, value) => {
        const { query, requests } = recordingClient()
        await query.filters('value', operator, value).vectorSearch('embedding', [0.1]).execute()
        expect(requests[0]).toMatchObject({ method: 'POST', body: { filters: { [`value__${operator}`]: value } } })
        expect(requests[0]!.url.pathname).toBe('/api/apps/app/datatables/items/data/query/')
        expect(requests[0]!.url.search).toBe('')
    })

    it('preserves scalar JSON types beside a nested filter tree', async () => {
        const { query, requests } = recordingClient()
        const tree: BackendFilterTreeRoot = [{ operator: 'or', value: [
            { field: 'owner_id', operator: 'eq', value: '12345678-1234-4234-8234-123456789012' },
            { field: 'created_at', operator: 'gte', value: new Date('2026-01-02T03:04:05+05:30') },
            { field: 'parent_id', operator: 'eq', value: null },
            { field: 'id', operator: 'in', value: [] },
        ] }]
        await query.filters('active', 'eq', false).filters('amount', 'eq', 0).filters('code', 'eq', '007')
            .filters(tree).vectorSearch('embedding', [0.1]).execute()
        expect(requests[0]!.body!.filters).toEqual({
            active: false, amount: 0, code: '007',
            and: [{ or: [
                { owner_id: '12345678-1234-4234-8234-123456789012' },
                { created_at__gte: '2026-01-01T21:34:05.000Z' },
                { parent_id: null },
                { id__in: [] },
            ] }],
        })
    })

    it('captures list values before the caller changes them', async () => {
        const { query, requests } = recordingClient()
        const bounds = [1, 3]
        const filtered = query.filters('id', 'between', bounds)
        bounds.push(5)
        await filtered.vectorSearch('embedding', [0.1]).execute()
        expect(requests[0]!.body!.filters).toEqual({ id__between: [1, 3] })
    })

    it('serializes Date range bounds as ISO values only in the JSON body', async () => {
        const { query, requests } = recordingClient()
        await query.filters([{ operator: 'and', value: [{ field: 'created_at', operator: 'between', value: [
            new Date('2026-01-02T03:04:05+05:30'), new Date('2026-01-03T00:00:00Z'),
        ] }] }]).vectorSearch('embedding', [0.1]).execute()
        expect(requests[0]!.body!.filters).toEqual({ and: [{ and: [{
            created_at__between: ['2026-01-01T21:34:05.000Z', '2026-01-03T00:00:00.000Z'],
        }] }] })
    })

    it('keeps the existing SDK ISO Date encoding on filtered-delete URLs', async () => {
        const { query, requests } = recordingClient()
        const date = new Date('2026-01-02T03:04:05+05:30')
        await query.filters([{ operator: 'and', value: [{ field: 'created_at', operator: 'gte', value: date }] }]).deleteFiltered().execute()
        const filter = JSON.parse(requests[0]!.url.searchParams.get('filter')!)
        expect(JSON.parse(filter.filters)).toEqual([{ operator: 'and', value: [
            { field: 'created_at', operator: 'gte', value: '2026-01-01T21:34:05.000Z' },
        ] }])
    })

    it('keeps GET and filtered-delete arrays in the legacy CSV form', async () => {
        const { query, requests } = recordingClient()
        const filtered = query.filters('id', 'between', [1, 3])
        await filtered.execute()
        await filtered.vectorSearch('embedding', [0.1]).execute()
        await filtered.deleteFiltered().execute()
        expect(requests[0]!.method).toBe('GET')
        expect(requests[0]!.url.searchParams.get('id__between')).toBe('1,3')
        expect(requests[2]!.method).toBe('DELETE')
        expect(JSON.parse(requests[2]!.url.searchParams.get('filter')!)).toEqual({ id__between: '1,3' })
    })

    it('keeps relationship types as repeated query parameters', async () => {
        const { query, requests } = recordingClient()
        await query.filters('id', 'in', [1, 3]).format('tree').types(['manager', 'peer']).execute()
        expect(requests[0]!.url.searchParams.get('id__in')).toBe('1,3')
        expect(requests[0]!.url.searchParams.getAll('relationship_type')).toEqual(['manager', 'peer'])
    })

    it('leaves single-record vector lookups on the existing GET route', async () => {
        const { query, requests } = recordingClient()
        await query.get('7').vectorSearch('embedding', [0.1]).execute()
        expect(requests[0]!.method).toBe('GET')
        expect(requests[0]!.url.pathname).toBe('/api/apps/app/datatables/items/data/7/')
        expect(JSON.parse(requests[0]!.url.searchParams.get('embedding__vector_near')!)).toEqual([0.1])
    })

    it.each([
        { stage: (q: Database) => q.create({ id: '7' }), method: 'POST', path: '/data/', body: { id: '7' } },
        { stage: (q: Database) => q.upsert({ id: '7' }), method: 'POST', path: '/data/upsert/', body: { id: '7' } },
        { stage: (q: Database) => q.get('7').update({ name: 'changed' }), method: 'PATCH', path: '/data/7/', body: { name: 'changed' } },
        { stage: (q: Database) => q.delete('7'), method: 'DELETE', path: '/data/7/', body: undefined },
    ])('preserves a staged $method mutation when vector options are set', async ({ stage, method, path, body }) => {
        const { query, requests } = recordingClient()
        await stage(query).vectorSearch('embedding', [0.1]).hybrid().execute()
        expect(requests[0]!.method).toBe(method)
        expect(requests[0]!.url.pathname).toBe(`/api/apps/app/datatables/items${path}`)
        expect(requests[0]!.body).toEqual(body)
    })

    it('ignores hybrid options without text search like the Python SDK', async () => {
        const { query, requests } = recordingClient()
        await query.vectorSearch('embedding', [0.1]).hybrid().execute()
        expect(requests[0]!.body).not.toHaveProperty('hybrid')
    })

    it('keeps a 1536-element embedding out of the URL', async () => {
        const { query, requests } = recordingClient()
        const vector = Array.from({ length: 1536 }, (_, index) => index / 1536)
        await query.vectorSearch('embedding', vector).execute()
        expect(requests[0]!.url.search).toBe('')
        expect(requests[0]!.body!.vector).toEqual({ field: 'embedding', value: vector })
    })
})

import { describe, expect, it } from 'vitest'
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { Client, Database } from '../../../src/index.js'
import type { BackendFilterTreeRoot } from '../../../src/lib/database/types.js'

function transport() {
    const client = new Client({ apiUrl: 'http://sdk-fixture.localhost/sites/query', appSlug: 'app', token: 'fixture-session' })
    const requests: InternalAxiosRequestConfig[] = []
    const axios = (client.httpClient as unknown as { axiosInstance: AxiosInstance }).axiosInstance
    axios.defaults.adapter = async config => {
        requests.push(config)
        return { data: { data: [], total: 0 }, status: 200, statusText: 'OK', headers: {}, config }
    }
    return { database: new Database(client).from('records'), requests }
}

describe('Database request identity and filter contract', () => {
    it.each(['get', 'patch', 'delete'] as const)('keeps a reserved-character record ID in one path segment for %s', async method => {
        const { database, requests } = transport()
        const id = 'a?secret=b#fragment/percent%value'
        const query = method === 'delete' ? database.delete(id) : method === 'patch' ? database.get(id).update({ title: 'edited' }) : database.get(id)
        await query.execute()
        const request = requests[0]!
        expect(request.method).toBe(method)
        const url = new URL(request.url!, request.baseURL)
        expect(url.pathname).toBe(`/api/apps/app/datatables/records/data/${encodeURIComponent(id)}/`)
        expect(url.search).toBe('')
        expect(url.hash).toBe('')
        expect(request.headers['X-Session-Token']).toBe('fixture-session')
    })

    it('replaces a repeated flat key without changing the original read builder', async () => {
        const { database, requests } = transport()
        const base = database.filters('state', 'ne', 'archived')
        await base.filters('state', 'ne', 'deleted').execute()
        await base.execute()
        const params = requests.map(request => new URL(request.url!, request.baseURL).searchParams)
        expect(params[0]!.get('state__ne')).toBe('deleted')
        expect(params[1]!.get('state__ne')).toBe('archived')
    })

    it('preserves repeated conditions and literal comma values in a JSON filter tree', async () => {
        const { database, requests } = transport()
        const tree: BackendFilterTreeRoot = [{ operator: 'and', value: [
            { field: 'state', operator: 'ne', value: 'archived' },
            { field: 'state', operator: 'ne', value: 'deleted' },
            { field: 'tag', operator: 'in', value: ['a,b', '007'] },
        ] }]
        await database.filters(tree).execute()
        const params = new URL(requests[0]!.url!, requests[0]!.baseURL).searchParams
        expect(JSON.parse(params.get('filters')!)).toEqual(tree)
        expect([...params.keys()]).toEqual(['filters'])
    })
})

import type { AxiosAdapter, AxiosRequestConfig } from 'axios'
import { expect, it } from 'vitest'
import { Client, Database } from '../../../src/index.js'

it('keeps upsert operation, body and route through operation-preserving fluent clones', async () => {
    const client = new Client({ apiUrl: 'https://example.invalid/sites/owned', appSlug: 'fixture' })
    const calls: AxiosRequestConfig[] = []
    const adapter: AxiosAdapter = async (config) => {
        calls.push(config)
        return { data: { status: 'success', message: 'done', data: { records: [{ id: 7, name: 'changed' }], count: 1 } }, status: 200, statusText: 'OK', headers: {}, config }
    }
    const transport = client.httpClient as unknown as { axiosInstance: { defaults: { adapter: AxiosAdapter } } }
    transport.axiosInstance.defaults.adapter = adapter
    const query = new Database<{ id: number; name: string }>(client).from<{ id: number; name: string }>('records')
    const body = { id: 7, name: 'changed' }
    const mutation = query.upsert(body, ['id'])
    const derived = mutation.include('descendants').depth(2).format('flat').types(['reports_to'])
    expect((await derived.execute()).data).toEqual({ records: [{ id: 7, name: 'changed' }], count: 1 })
    await mutation.execute()
    for (const call of calls) {
        expect(call.method).toBe('post')
        expect(call.url).toContain('/data/upsert/')
        expect(call.url).toContain('unique_fields=id')
        expect(JSON.parse(call.data)).toEqual(body)
    }
    expect(calls[0]!.url).toContain('depth=2')
    expect(calls[1]!.url).not.toContain('depth=')
})

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createServer, type Server } from 'node:http'
import { readFileSync } from 'node:fs'
import { Client } from '../../../src/client.js'
import { Functions } from '../../../src/lib/functions/FunctionsClient.js'
import type { FunctionInvocation } from '../../../src/lib/functions/types.js'

// Generated using the backend serializer/AppDataResponse, including null callers
// and list-only omission of logs. No fake HttpClient or module method is substituted.
const wire = JSON.parse(readFileSync(new URL('../../fixtures/function-wire.json', import.meta.url), 'utf8'))
interface RequestRecord { method: string; path: string; body?: unknown }
let server: Server
let client: Client
let reply: unknown
let status: number
const requests: RequestRecord[] = []

beforeEach(async () => {
    requests.length = 0
    reply = wire.sync
    status = 200
    server = createServer((request, response) => {
        const chunks: Buffer[] = []
        request.on('data', chunk => chunks.push(Buffer.from(chunk)))
        request.on('end', () => {
            const body = Buffer.concat(chunks).toString()
            requests.push({ method: request.method!, path: request.url!, ...(body && { body: JSON.parse(body) }) })
            response.writeHead(status, { 'Content-Type': 'application/json' })
            response.end(JSON.stringify(reply))
        })
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Missing test server address')
    client = new Client({ apiUrl: `http://127.0.0.1:${address.port}/sites/demo`, appSlug: 'app', authMode: 'apiKey', apiKey: 'fixture' })
})

afterEach(async () => {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
})

describe('Functions transport contract', () => {
    it('preserves a synchronous false value and the full invocation envelope', async () => {
        const result = await new Functions(client).execute<boolean>('count-items', { async: false, params: { dry_run: false } })
        expect(result).toEqual(wire.sync)
        expect(result.data).toBe(false)
        expect(result.invocation.function).toBe(17)
        expect(result.invocation.user_username).toBeNull()
        expect(result.invocation.task_result?.status).toBe('SUCCESS')
        expect(requests).toEqual([{ method: 'POST', path: '/sites/demo/api/apps/app/functions/count-items/execute/', body: { params: { dry_run: false }, async: false } }])
    })

    it('does not infer queued mode from an already completed task', async () => {
        reply = wire.queued
        status = 202
        const result = await new Functions(client).execute('count-items', { async: true })
        expect(result.queued).toBe(true)
        expect(result.data).toEqual([])
        expect(result.invocation.task_result?.status).toBe('SUCCESS')
        expect(requests[0]?.body).toEqual({ async: true, params: {} })
    })

    it('omits the request flag for the function default and permits a missing retained task result', async () => {
        reply = wire.pending
        status = 202
        const result = await new Functions(client).execute('count-items')
        expect(result.invocation.task_result).toBeNull()
        expect(result.queued).toBe(true)
        expect(requests[0]?.body).toEqual({ params: {} })
    })

    it('preserves a synchronous None normalization without misclassifying the empty array', async () => {
        reply = wire.none_result
        const result = await new Functions(client).execute('count-items', { async: false })
        expect(result.data).toEqual([])
        expect(result.queued).toBe(false)
    })

    it('reads typed single/list invocation payloads without inventing top-level task status', async () => {
        reply = wire.detail
        const detail = await client.httpClient.get<FunctionInvocation>('api/invocations/42/')
        expect(detail.logs).toEqual(wire.detail.logs)
        expect(detail.task_result?.task_args).toEqual({ dry_run: false })
        reply = wire.invocations
        const page = await client.httpClient.get<{ data: FunctionInvocation[]; total: number }>('api/invocations/?page=2&page_size=10')
        expect(page.total).toBe(1)
        expect(page.data[0]).not.toHaveProperty('logs')
        expect(page.data[0]?.task_result?.status).toBe('SUCCESS')
        expect(requests.map(request => request.path)).toEqual(['/sites/demo/api/invocations/42/', '/sites/demo/api/invocations/?page=2&page_size=10'])
    })
})

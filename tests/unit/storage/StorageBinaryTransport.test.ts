import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { Client, NotFoundError, Storage } from '../../../src/index.js'

const content = Buffer.from([0, 255, 16, 195, 169, 13, 10])
const server = createServer((request, response) => {
    if (request.url?.endsWith('/missing.bin/')) {
        response.writeHead(404, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify({ code: 'NOT_FOUND', message: 'Owned object missing', detail: 'binary refusal' }))
    } else {
        response.writeHead(200, { 'Content-Type': 'application/octet-stream' })
        response.end(content)
    }
})
let storage: Storage

beforeAll(async () => {
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const port = (server.address() as AddressInfo).port
    storage = new Storage(new Client({ apiUrl: `http://127.0.0.1:${port}`, appSlug: 'fixture' })).from('owned')
})

afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
})

it('downloads an actual binary response as an unchanged Blob on Node', async () => {
    const downloaded = await storage.download('owned.bin').execute<Blob>()
    expect(downloaded).toBeInstanceOf(Blob)
    expect(downloaded.type).toBe('application/octet-stream')
    expect(Buffer.from(await downloaded.arrayBuffer())).toEqual(content)
})

it('preserves the JSON refusal envelope when download response type is binary', async () => {
    const error = await storage.download('missing.bin').execute().catch((reason: unknown) => reason)
    expect(error).toBeInstanceOf(NotFoundError)
    expect(error).toMatchObject({ statusCode: 404, code: 'NOT_FOUND', message: 'Owned object missing', detail: 'binary refusal' })
})

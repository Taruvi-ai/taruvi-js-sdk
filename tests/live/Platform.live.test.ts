import { randomUUID } from 'node:crypto'
import { beforeAll, describe, expect, it } from 'vitest'
import {
    Analytics, App, Auth, Client, ConflictError, Database, Functions,
    NotFoundError, Secrets, Storage, TaruviError,
} from '../../src/index.js'
import type {
    AppSettingsResponse, FunctionResponse, FunctionTaskResult, SecretResponse,
    StorageBrowseResponse, StorageDeleteBatchResponse, StorageListResponse,
    StorageResponse, StorageUploadBatchResponse, TaruviResponse,
} from '../../src/index.js'
import { loginClient, readLiveFixture } from './fixture.js'
import type { LiveFixture } from './fixture.js'

let fixture: LiveFixture
let client: Client
beforeAll(async () => {
    fixture = readLiveFixture()
    client = await loginClient(fixture)
})

interface Row { id: number; name: string; email: string; description?: string }

function rowsOf<T>(response: TaruviResponse<T | T[]>): T[] {
    return Array.isArray(response.data) ? response.data : [response.data]
}

async function terminalTask(taskId: string): Promise<FunctionTaskResult> {
    let task: FunctionTaskResult | undefined
    await expect.poll(async () => {
        const response = await client.httpClient.get<TaruviResponse<FunctionTaskResult>>(`api/functions/result/${encodeURIComponent(taskId)}/`)
        expect(response.status).toBe('success')
        task = response.data
        expect(task.task_id).toBe(taskId)
        return task.status
    }, { timeout: 60_000, interval: 250 }).toMatch(/^(SUCCESS|FAILURE|REVOKED)$/)
    expect(task!.status).toBe('SUCCESS')
    return task!
}

describe('Auth', () => {
    it('validates the actual session and user while client clearing remains isolated', async () => {
        const auth = new Auth(client)
        expect(auth.hasToken()).toBe(true)
        await auth.validateSession()
        expect(await auth.isUserAuthenticated()).toBe(true)
        const user = await auth.getCurrentUser()
        expect(user?.status).toBe('success')
        expect(user?.data).toMatchObject(fixture.resources.user)
        const second = new Client({ apiUrl: fixture.api_url, appSlug: fixture.app_slug, token: auth.getSessionToken()! })
        const other = new Auth(second)
        other.clearSession()
        expect(other.hasToken()).toBe(false)
        expect(await other.getCurrentUser()).toBeNull()
        expect(await auth.isUserAuthenticated()).toBe(true)
        expect((await auth.getCurrentUser())?.data).toMatchObject(fixture.resources.user)
    })
})

describe('Database', () => {
    it('persists CRUD, page totals, JSON filters and unique-field upsert without widening scope', async () => {
        const database = new Database<Row>(client).from<Row>(fixture.resources.database.table_name)
        const marker = `js-${randomUUID()}`
        const owned = new Set<number>()
        try {
            const response = await database.create(Array.from({ length: 3 }, (_, index) => ({
                name: `${marker}-${index}`, email: `${marker}-${index}@example.invalid`, description: `row-${index}`,
            }))).execute()
            expect(response.status).toBe('success')
            const created = rowsOf(response)
            created.forEach((row) => owned.add(row.id))
            expect(created).toHaveLength(3)
            const scoped = database.filters('name', 'startswith', marker).sort('id')
            const page = await scoped.pageSize(2).page(2).execute()
            expect(page.total).toBe(3)
            expect(rowsOf(page).map((row) => row.id)).toEqual([created[2]!.id])
            expect(await scoped.count()).toBe(3)
            const selected = await database.filters([{ operator: 'or', value: [
                { field: 'email', operator: 'eq', value: created[0]!.email },
                { field: 'email', operator: 'eq', value: created[2]!.email },
            ] }]).sort('id').execute()
            expect(rowsOf(selected).map((row) => row.id)).toEqual([created[0]!.id, created[2]!.id])
            await database.get(String(created[0]!.id)).update({ description: 'persisted change' }).execute()
            expect((await database.get(String(created[0]!.id)).first())?.description).toBe('persisted change')
            const upsert = await database.upsert({ name: `${marker}-renamed`, email: created[1]!.email, description: 'upserted' }, ['email']).format('flat').depth(1).execute()
            expect(upsert.status).toBe('success')
            expect(upsert.data).toEqual({ count: 1, records: [{
                id: created[1]!.id, name: `${marker}-renamed`, email: created[1]!.email, description: 'upserted',
            }] })
            expect(await database.get(String(created[1]!.id)).first()).toMatchObject({ id: created[1]!.id, description: 'upserted' })
            const bulk = await database.bulkUpdate([{ id: created[0]!.id, description: 'bulk persisted' }]).format('flat').execute()
            expect(bulk.data.count).toBe(1)
            expect(bulk.data.records).toEqual([{
                id: created[0]!.id, name: created[0]!.name, email: created[0]!.email, description: 'bulk persisted',
            }])
            expect((await database.get(String(created[0]!.id)).first())?.description).toBe('bulk persisted')
            await expect(database.create({ name: marker, email: created[1]!.email }).execute()).rejects.toBeInstanceOf(ConflictError)
            await database.delete(String(created[2]!.id)).execute()
            owned.delete(created[2]!.id)
            await expect(database.get(String(created[2]!.id)).execute()).rejects.toBeInstanceOf(NotFoundError)
            expect(await database.filters('name', 'startswith', marker).count()).toBe(2)
        } finally {
            for (const id of owned) await database.delete(String(id)).execute()
        }
    })
})

describe('Storage', () => {
    it('roundtrips real binary bytes, metadata, browse and partial deletion', async () => {
        const bucket = new Storage(client).from(fixture.resources.storage.bucket_slug)
        const prefix = `${fixture.resources.storage.prefix}/js-${randomUUID()}/`
        const paths = [`${prefix}café #1.bin`, `${prefix}nested/readme.txt`]
        const owned = new Set(paths)
        const bytes = new Uint8Array([0, 255, 16, 195, 169, 13, 10])
        try {
            const upload = await bucket.upload({
                files: [new File([bytes], 'binary.bin', { type: 'application/octet-stream' }), new File(['nested'], 'readme.txt', { type: 'text/plain' })],
                metadatas: [{ purpose: 'acceptance' }, {}], paths,
            }).execute<StorageUploadBatchResponse>()
            expect(upload.status).toBe('success')
            expect(upload.data).toMatchObject({ uploaded_count: 2, failed_count: 0, total: 2, failed: [] })
            expect(upload.data.successful.map((entry) => entry.object.file_path)).toEqual(paths)
            const downloaded = await bucket.download(paths[0]!).execute<Blob>()
            expect(downloaded).toBeInstanceOf(Blob)
            expect(new Uint8Array(await downloaded.arrayBuffer())).toEqual(bytes)
            const metadata = { reviewed: true, revision: 2 }
            expect((await bucket.update(paths[0]!, { metadata, visibility: 'private' }).execute<StorageResponse>()).data.metadata).toEqual(metadata)
            expect((await bucket.metadata(paths[0]!).execute<StorageResponse>()).data.metadata).toEqual(metadata)
            const inventory = await bucket.filter({ prefix }).execute<StorageListResponse>()
            expect(inventory.total).toBe(2)
            expect(new Set(inventory.data.map((entry) => entry.file_path))).toEqual(new Set(paths))
            const browse = await bucket.browse({ prefix, sort: 'name', order: 'asc' }).execute<StorageBrowseResponse>()
            expect(browse.data.objects.map((entry) => entry.path)).toEqual([paths[0]])
            expect(browse.data.folders).toEqual([{ type: 'folder', name: 'nested', path: `${prefix}nested/` }])
            const deleted = await bucket.delete([paths[0]!, `${prefix}missing.txt`]).execute<StorageDeleteBatchResponse>()
            expect(deleted.data).toEqual({ deleted_count: 1, failed: [{ path: `${prefix}missing.txt`, error: 'Object not found' }], message: 'Deleted 1 of 2 objects' })
            owned.delete(paths[0]!)
            await expect(bucket.download(paths[0]!).execute()).rejects.toBeInstanceOf(NotFoundError)
        } finally {
            if (owned.size) {
                const cleanup = await bucket.delete([...owned]).execute<StorageDeleteBatchResponse>()
                expect(cleanup.data.failed.every((item) => item.error === 'Object not found')).toBe(true)
                expect(cleanup.data.deleted_count + cleanup.data.failed.length).toBe(owned.size)
            }
        }
    })
})

describe('Functions', () => {
    it.each([false, true])('proves terminal broker/worker output for queued=%s', async (queued) => {
        const payload = { marker: randomUUID(), value: false, zero: 0, empty: [], nested: { answer: 42 } }
        const result: FunctionResponse<typeof payload> = await new Functions(client).execute(fixture.resources.functions.function_slug, { async: queued, params: payload })
        expect(result.status).toBe('success')
        expect(result.queued).toBe(queued)
        expect(result.data).toEqual(queued ? [] : payload)
        expect(result.invocation.function_slug).toBe(fixture.resources.functions.function_slug)
        expect(typeof result.invocation.id).toBe('number')
        const task = await terminalTask(result.invocation.celery_task_id)
        expect(task.result).toMatchObject({ result: payload, success: true })
        expect(task.date_done).toBeTruthy()
    })
})

describe('Analytics', () => {
    it('returns bound values exactly and rejects missing parameters and cross-app execution', async () => {
        const analytics = new Analytics(client)
        const query = fixture.resources.analytics.query_slug
        const value = "'; DROP TABLE analytics_analyticsquery; --"
        const result = await analytics.execute<{ value: string }[]>(query, { params: { value } })
        expect(result.status).toBe('success')
        expect(result.data).toEqual([{ value }])
        expect(result.total).toBe(1)
        expect(result.execution_key).toMatch(/^[a-f0-9-]{36}$/)
        const invalid = await analytics.execute(query).catch((error: unknown) => error)
        expect(invalid).toBeInstanceOf(TaruviError)
        expect(invalid).toMatchObject({
            statusCode: 400, code: 'BAD_REQUEST',
            message: 'Query placeholder {{ value }} has no value.',
            detail: "Supply 'value' in the parameters when running this query.",
        })
        const other = new Client({ apiUrl: fixture.api_url, appSlug: fixture.resources.other_app_slug, token: new Auth(client).getSessionToken()! })
        await expect(new Analytics(other).execute(query, { params: { value } })).rejects.toBeInstanceOf(NotFoundError)
    })
})

describe('Secrets', () => {
    it('preserves JSON values, inheritance, batch metadata and tag refusals', async () => {
        const secrets = new Secrets(client)
        const resource = fixture.resources.secrets
        const appSecret = await secrets.get(resource.shadowed_key, { app: fixture.app_slug, tags: [resource.tag] }).execute<SecretResponse>()
        expect(appSecret.data).toMatchObject({ key: resource.shadowed_key, value: resource.app_value, tags: [resource.tag], secret_type: resource.secret_type_name })
        const inherited = await secrets.get(resource.shadowed_key, { app: fixture.resources.other_app_slug }).execute<SecretResponse>()
        expect(inherited.data.value).toEqual(resource.site_value)
        const batch = await secrets.list([resource.shadowed_key, resource.site_only_key], { app: fixture.app_slug })
        expect(batch.data).toEqual({ [resource.shadowed_key]: resource.app_value, [resource.site_only_key]: resource.site_value })
        const metadata = await secrets.list([resource.shadowed_key], { app: fixture.app_slug, includeMetadata: true })
        expect(metadata.data[resource.shadowed_key]).toEqual({ value: resource.app_value, tags: [resource.tag], secret_type: resource.secret_type_name, sensitivity_level: 'private' })
        await expect(secrets.get(resource.shadowed_key, { app: fixture.app_slug, tags: ['absent-owned-tag'] }).execute()).rejects.toBeInstanceOf(NotFoundError)
        await expect(secrets.get(`${fixture.fixture_id}-missing`, { app: fixture.app_slug }).execute()).rejects.toBeInstanceOf(NotFoundError)
    })
})

describe('App Settings', () => {
    it('reads the two owned apps without inventing absent serializer fields', async () => {
        const first = await new App(client).settings().execute<AppSettingsResponse>()
        expect(first.status).toBe('success')
        expect(first.data).toMatchObject(fixture.resources.app_settings)
        expect(first.data.default_frontend_worker_slug).toBeNull()
        expect(first.data).not.toHaveProperty('banner_image')
        const other = new Client({ apiUrl: fixture.api_url, appSlug: fixture.resources.other_app_slug, token: new Auth(client).getSessionToken()! })
        expect((await new App(other).settings().execute<AppSettingsResponse>()).data).toMatchObject(fixture.resources.other_app_settings)
    })
})

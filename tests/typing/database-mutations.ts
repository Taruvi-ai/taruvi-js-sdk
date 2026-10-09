import { Database } from '../../src/index.js'
import type { Client } from '../../src/index.js'

interface Row { id: number; name: string; records: string; count: string }

async function consume(client: Client): Promise<void> {
    const table = new Database(client).from<Row>('records')
    const first: Row | null = await table.first()
    const count: number = await table.count()
    if (first) {
        const recordColumn: string = first.records
        const countColumn: string = first.count
        void [recordColumn, countColumn]
    }
    const upsert = await table.upsert({ id: 7, name: 'changed' }, ['id'])
        .include('descendants').depth(2).format('flat').types(['reports_to']).execute()
    const upsertRows: Row[] = upsert.data.records
    const upsertCount: number = upsert.data.count
    if (!Array.isArray(upsert.data)) {
        // @ts-expect-error Excluding arrays must not turn the mutation envelope into a row.
        const directUpsertName: string = upsert.data.name
        void directUpsertName
    }
    const bulk = await table.bulkUpdate([{ id: 7, name: 'bulk change' }]).depth(1).execute()
    const bulkRows: Row[] = bulk.data.records
    const bulkCount: number = bulk.data.count
    if (!Array.isArray(bulk.data)) {
        // @ts-expect-error Bulk update remains an envelope after an ordinary array guard.
        const directBulkName: string = bulk.data.name
        void directBulkName
    }
    // @ts-expect-error first is a read helper; a mutation must use execute.
    await table.upsert({ id: 7 }).first()
    // @ts-expect-error count is a read helper; a mutation must use execute.
    await table.bulkUpdate([{ id: 7 }]).count()
    const untyped = new Database(client).from('records')
    // @ts-expect-error Read-helper binding remains strict for open record types too.
    await untyped.upsert({ id: 7 }).first()
    const readAgain: Row | null = await table.upsert({ id: 7 }).get('7').first()
    void [first, count, upsertRows, upsertCount, bulkRows, bulkCount, readAgain]
}
void consume

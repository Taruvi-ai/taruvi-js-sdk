import type { Client } from "../../client.js";

export class Database {
    private client: Client

    constructor(client: Client) {
        this.client = client
    }

    // TODO: Implement database operations
    // - from (select from table)
    // - insert (insert records)
    // - update (update records)
    // - delete (delete records)
    // - upsert (insert or update)
    // - select (query builder)
    // - filter (where conditions)
}
import type { Client } from "../../client.js";

export class Storage {
    private client: Client

    constructor(client: Client) {
        this.client = client
    }

    // TODO: Implement storage operations
    // - upload files
    // - download files
    // - delete files
    // - list files
}

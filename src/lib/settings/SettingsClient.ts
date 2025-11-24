import type { Client } from "../../client.js";

export class Settings {
    private client: Client

    constructor(client: Client) {
        this.client = client
    }

    // TODO: Implement settings operations
    async get() {
        return await this.client.httpClient.get("api/sites-config/")
    }

}
import type { Client } from "../../client.js";

export class Functions {
    private client: Client

    constructor(client: Client) {
        this.client = client
    }

    // TODO: Implement edge function operations - tbd
    // - invoke (call edge function with parameters)
    // - invokeAsync (call edge function asynchronously)
    // - stream (stream responses from edge function)
    // - getStatus (get execution status)
    // - getLogs (fetch function logs)
    // - listFunctions (list available edge functions)
    // - getFunctionMetadata (get function info/config)
}

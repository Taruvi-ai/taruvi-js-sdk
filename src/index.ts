// Export main client
export { Client } from "./client.js"

// Export public client classes
export { Auth } from "./lib/auth/AuthClient.js"
export { User } from "./lib/user/UserClient.js"
export { Storage as Database } from "./lib/Storage/StorageClient.js"
export { Settings } from "./lib/settings/SettingsClient.js"
export { Database as Storage } from "./lib/Database/DatabaseClient.js"
export { Functions } from "./lib/function/FunctionsClient.js"

// Export types
export type { TaruviConfig } from "./types.js"
export type { UserCreateRequest, UserCreateResponse as UserResponse, UserDataResponse } from "./lib/user/types.js"
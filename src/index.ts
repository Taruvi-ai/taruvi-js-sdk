// Export main client
export { Client } from "./client.js"

// Export public client classes
export { Auth } from "./lib/auth/AuthClient.js"
export { User } from "./lib/user/UserClient.js"
export { Storage } from "./lib/Storage/StorageClient.js"
export { Database } from "./lib/Database/DatabaseClient.js"
export { Settings } from "./lib/Settings/SettingsClient.js"
export { Functions } from "./lib/Function/FunctionsClient.js"
export { Secrets } from "./lib/Secrets/SecretsClient.js"
export { Policy } from "./lib/Policy/PolicyClient.js"
export { App } from "./lib/App/AppClient.js"
export { Analytics } from "./lib/Analytics/AnalyticsClient.js"

// Export types
export type { TaruviConfig, StorageFilters, DatabaseFilters } from "./types.js"
export type { AuthTokens } from "./lib-internal/token/TokenClient.js"
export type { UserCreateRequest, UserCreateResponse as UserResponse, UserDataResponse } from "./lib/user/types.js"
export type { Principal, Resource, Resources } from "./lib/Policy/types.js"
export type { RoleResponse } from "./lib/App/types.js"
export type { FunctionRequest, FunctionResponse, FunctionInvocation } from "./lib/Function/types.js"
export type { DatabaseRequest, DatabaseResponse, FilterOperator, SortOrder } from "./lib/Database/types.js"
export type { StorageRequest, StorageUpdateRequest, StorageResponse } from "./lib/Storage/types.js"
export type { SettingsResponse } from "./lib/Settings/types.js"
export type { SecretRequest, SecretResponse } from "./lib/Secrets/types.js"
export type { AnalyticsRequest, AnalyticsResponse } from "./lib/Analytics/types.js"
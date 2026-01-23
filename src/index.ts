// Export main client
export { Client } from "./client.js"

// Export public client classes
export { Auth } from "./lib/auth/AuthClient.js"
export { User } from "./lib/users/UserClient.js"
export { Storage } from "./lib/storage/StorageClient.js"
export { Database } from "./lib/database/DatabaseClient.js"
export { Settings } from "./lib/settings/SettingsClient.js"
export { Functions } from "./lib/functions/FunctionsClient.js"
export { Secrets } from "./lib/secrets/SecretsClient.js"
export { Policy } from "./lib/policy/PolicyClient.js"
export { App } from "./lib/app/AppClient.js"
export { Analytics } from "./lib/analytics/AnalyticsClient.js"

// Export types
export type { TaruviConfig, StorageFilters, DatabaseFilters } from "./types.js"
export type { AuthTokens } from "./lib-internal/token/TokenClient.js"
export type { UserCreateRequest, UserCreateResponse as UserResponse, UserDataResponse, UserUpdateRequest, UserUpdateResponse } from "./lib/users/types.js"
export type { Principal, Resource, Resources } from "./lib/policy/types.js"
export type { RoleResponse, SettingsResponse as AppSettingsResponse } from "./lib/app/types.js"
export type { FunctionRequest, FunctionResponse, FunctionInvocation } from "./lib/functions/types.js"
export type { DatabaseRequest, DatabaseResponse, FilterOperator, SortOrder } from "./lib/database/types.js"
export type { StorageRequest, StorageUpdateRequest, StorageResponse } from "./lib/storage/types.js"
export type { SettingsResponse } from "./lib/settings/types.js"
export type { SecretRequest, SecretResponse } from "./lib/secrets/types.js"
export type { AnalyticsRequest, AnalyticsResponse } from "./lib/analytics/types.js"
// Export main client
export { Client } from "./client.js"

// Export error classes
export { TaruviError, ValidationError, AuthError, ForbiddenError, NotFoundError, ConflictError, TimeoutError, NetworkError } from "./lib-internal/errors/index.js"
export { ErrorCode } from "./lib-internal/errors/index.js"
export type { ErrorResponseBody } from "./lib-internal/errors/index.js"

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

// Export core types
export type { TaruviConfig, TaruviResponse, PaginationInfo, StorageFilters, DatabaseFilters } from "./types.js"
export type { AuthTokens } from "./lib-internal/token/TokenClient.js"

// User types
export type { UserCreateRequest, UserData, UserUpdateRequest, UserListFilters, UserApp, UserResponse, UserListResponse, UserAppsResponse, AssignRolesRequest, RevokeRolesRequest, RolesResponse, UserGroup, UserPermission, UserRole, UserPreferences, UserPreferencesUpdate, UserPreferencesResponse } from "./lib/users/types.js"

// Policy types
export type { Principal, Resource, Resources, PolicyCheckResult, PolicyCheckBatchResult, ResourceCheckResponse, GetAllowedActionsOptions } from "./lib/policy/types.js"

// App types
export type { RoleData, AppSettingsData, RoleResponse, RolesListResponse, AppSettingsResponse } from "./lib/app/types.js"

// Function types
export type { FunctionRequest, FunctionResponse, FunctionInvocation } from "./lib/functions/types.js"

// Database types
export type { DatabaseRequest, DatabaseResponse, DatabaseSingleResponse, FilterOperator, SortOrder, GraphInclude, GraphFormat, EdgeRequest, EdgeResponse, EdgeDeleteRequest } from "./lib/database/types.js"

// Storage types
export type { StorageRequest, StorageUpdateRequest, StorageObject, StorageResponse, StorageListResponse, StorageUploadBatchResponse, StorageDeleteBatchResponse } from "./lib/storage/types.js"

// Settings types
export type { SiteSettingsData, SettingsResponse } from "./lib/settings/types.js"

// Secrets types
export type { SecretCreateRequest, SecretUpdateRequest, SecretData, SecretResponse, SecretsListResponse, SecretsBatchResponse, SecretsBatchMetadataResponse, GetSecretOptions, GetSecretsOptions } from "./lib/secrets/types.js"

// Analytics types
export type { AnalyticsRequest, AnalyticsResponse } from "./lib/analytics/types.js"
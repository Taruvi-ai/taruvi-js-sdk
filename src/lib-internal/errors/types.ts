/**
 * Error severity levels for categorizing errors
 */
export enum ErrorSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

/**
 * Standard error codes used across the SDK
 */
export enum ErrorCode {
    // General errors (1000-1099)
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    TIMEOUT_ERROR = 'TIMEOUT_ERROR',

    // Network errors (1100-1199)
    NETWORK_ERROR = 'NETWORK_ERROR',
    CONNECTION_ERROR = 'CONNECTION_ERROR',
    REQUEST_FAILED = 'REQUEST_FAILED',

    // Authentication errors (1200-1299)
    AUTH_ERROR = 'AUTH_ERROR',
    UNAUTHORIZED = 'UNAUTHORIZED',
    TOKEN_EXPIRED = 'TOKEN_EXPIRED',
    TOKEN_INVALID = 'TOKEN_INVALID',
    SESSION_EXPIRED = 'SESSION_EXPIRED',
    INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

    // Authorization errors (1300-1399)
    FORBIDDEN = 'FORBIDDEN',
    INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

    // Validation errors (1400-1499)
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    INVALID_INPUT = 'INVALID_INPUT',
    MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
    INVALID_FORMAT = 'INVALID_FORMAT',

    // Database errors (1500-1599)
    DATABASE_ERROR = 'DATABASE_ERROR',
    QUERY_FAILED = 'QUERY_FAILED',
    RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
    DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
    CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',

    // Storage errors (1600-1699)
    STORAGE_ERROR = 'STORAGE_ERROR',
    FILE_NOT_FOUND = 'FILE_NOT_FOUND',
    FILE_TOO_LARGE = 'FILE_TOO_LARGE',
    INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
    UPLOAD_FAILED = 'UPLOAD_FAILED',
    DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',

    // Function errors (1700-1799)
    FUNCTION_ERROR = 'FUNCTION_ERROR',
    FUNCTION_NOT_FOUND = 'FUNCTION_NOT_FOUND',
    FUNCTION_EXECUTION_FAILED = 'FUNCTION_EXECUTION_FAILED',
    FUNCTION_TIMEOUT = 'FUNCTION_TIMEOUT',

    // Rate limiting errors (1800-1899)
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

    // Client errors (1900-1999)
    CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
    INVALID_API_KEY = 'INVALID_API_KEY',
    INVALID_CONFIG = 'INVALID_CONFIG'
}

/**
 * Base error response structure
 */
export interface ErrorResponse {
    code: ErrorCode;
    message: string;
    severity: ErrorSeverity;
    timestamp: string;
    requestId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    cause?: Error | undefined;
}

/**
 * HTTP error response from the server
 */
export interface HttpErrorResponse {
    status: number;
    statusText: string;
    message?: string;
    code?: string;
    details?: unknown;
}

/**
 * Validation error details
 */
export interface ValidationErrorDetail {
    field: string;
    message: string;
    value?: unknown;
}

/**
 * Error codes matching the backend's ErrorCode enum.
 * Maps 1:1 with base.responses.error_codes.ErrorCode in Python.
 */
export enum ErrorCode {
    BAD_REQUEST = 'BAD_REQUEST',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',
    NOT_FOUND = 'NOT_FOUND',
    CONFLICT = 'CONFLICT',
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',
    NETWORK_ERROR = 'NETWORK_ERROR'
}

/**
 * Backend error response shape.
 * Matches AppException.to_dict() output.
 */
export interface ErrorResponseBody {
    status: 'error'
    code: string
    message: string
    detail?: string
    errors?: Record<string, unknown>
    data?: unknown
}

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
    RATE_LIMITED = 'RATE_LIMITED',
    GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',
    NETWORK_ERROR = 'NETWORK_ERROR',
    // Billing gate refusals: the organization's billing blocks the request.
    ACCOUNT_SUSPENDED = 'account_suspended',
    PRODUCT_SUSPENDED = 'product_suspended',
    GATE_UNAVAILABLE = 'gate_unavailable'
}

/**
 * Backend error response shape.
 * Matches AppException.to_dict() output.
 */
export interface ErrorResponseBody {
    status?: 'error'
    code: string
    message?: string
    /** The gated product area, on billing refusals. */
    module?: string
    detail?: string
    errors?: Record<string, unknown>
    data?: unknown
}

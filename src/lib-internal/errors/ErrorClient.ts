import { ErrorCode, type ErrorResponseBody } from './types.js'

/**
 * Base SDK error. All typed errors extend this.
 */
export class TaruviError extends Error {
    public readonly code: string
    public readonly statusCode: number
    public readonly detail: string | undefined
    public readonly errors: Record<string, unknown> | undefined
    public readonly data: unknown

    constructor(message: string, statusCode: number, code: string = ErrorCode.INTERNAL_ERROR, detail?: string, errors?: Record<string, unknown>, data?: unknown) {
        super(message)
        this.name = 'TaruviError'
        this.statusCode = statusCode
        this.code = code
        this.detail = detail
        this.errors = errors
        this.data = data
    }
}

export class ValidationError extends TaruviError {
    constructor(message = 'Validation failed', detail?: string, errors?: Record<string, unknown>) {
        super(message, 400, ErrorCode.VALIDATION_ERROR, detail, errors)
        this.name = 'ValidationError'
    }
}

export class AuthError extends TaruviError {
    /** The rejected request predates the currently stored session. Contains no credentials. */
    public readonly staleSession: boolean

    constructor(message = 'Authentication required', detail?: string, statusCode = 401, staleSession = false) {
        super(message, statusCode, ErrorCode.UNAUTHORIZED, detail)
        this.name = 'AuthError'
        this.staleSession = staleSession
    }
}

export class ForbiddenError extends TaruviError {
    constructor(message = 'Permission denied', detail?: string) {
        super(message, 403, ErrorCode.FORBIDDEN, detail)
        this.name = 'ForbiddenError'
    }
}

export class NotFoundError extends TaruviError {
    constructor(message = 'Resource not found', detail?: string) {
        super(message, 404, ErrorCode.NOT_FOUND, detail)
        this.name = 'NotFoundError'
    }
}

export class ConflictError extends TaruviError {
    constructor(message = 'Resource conflict', detail?: string) {
        super(message, 409, ErrorCode.CONFLICT, detail)
        this.name = 'ConflictError'
    }
}

export class TimeoutError extends TaruviError {
    constructor(message = 'Request timeout', detail?: string) {
        super(message, 504, ErrorCode.GATEWAY_TIMEOUT, detail)
        this.name = 'TimeoutError'
    }
}

export class RateLimitError extends TaruviError {
    public readonly retryAfter: number | undefined

    constructor(message = 'Rate limit exceeded', retryAfter?: number, detail?: string) {
        super(message, 429, ErrorCode.RATE_LIMITED, detail)
        this.name = 'RateLimitError'
        this.retryAfter = retryAfter
    }
}

export class NetworkError extends TaruviError {
    constructor(message = 'Network error') {
        super(message, 0, ErrorCode.NETWORK_ERROR)
        this.name = 'NetworkError'
    }
}

/**
 * Maps HTTP status + response body to the appropriate typed error.
 */
export type BillingErrorCode =
    | ErrorCode.ACCOUNT_SUSPENDED
    | ErrorCode.PRODUCT_SUSPENDED
    | ErrorCode.GATE_UNAVAILABLE

const BILLING_CODES = new Set<string>([
    ErrorCode.ACCOUNT_SUSPENDED,
    ErrorCode.PRODUCT_SUSPENDED,
    ErrorCode.GATE_UNAVAILABLE,
])

/**
 * The organization's billing blocked the request.
 * - `account_suspended` (402): the account isn't active.
 * - `product_suspended` (429): the plan's usage for `module` is used up for this period.
 * - `gate_unavailable` (503): billing status couldn't be read; retry shortly.
 */
export class BillingError extends TaruviError {
    declare readonly code: BillingErrorCode
    /** The product area that was blocked, such as `database`. */
    public readonly module: string | undefined
    /** Only `gate_unavailable` is worth retrying. */
    public readonly retryable: boolean

    constructor(message: string, statusCode: number, code: BillingErrorCode, module?: string, detail?: string) {
        super(message, statusCode, code, detail)
        this.name = 'BillingError'
        this.module = module
        this.retryable = code === ErrorCode.GATE_UNAVAILABLE
    }
}

export function createErrorFromResponse(statusCode: number, body?: ErrorResponseBody, retryAfter?: number): TaruviError {
    // Some refusals, such as billing gates, carry only `detail`.
    const message = body?.message || body?.detail || 'Request failed'
    const code = body?.code || ErrorCode.INTERNAL_ERROR

    if (BILLING_CODES.has(code)) {
        return new BillingError(message, statusCode, code as BillingErrorCode, body?.module, body?.detail)
    }
    const detail = body?.detail
    const errors = body?.errors
    const data = body?.data

    switch (statusCode) {
        case 400:
            if (code === ErrorCode.VALIDATION_ERROR) {
                return new ValidationError(message, detail, errors)
            }
            return new TaruviError(message, 400, code, detail, errors, data)
        case 401:
            return new AuthError(message, detail)
        // 410 and 419 mean the session expired or was ended; treat them like 401.
        case 410:
        case 419:
            return new AuthError(body?.message || 'Session expired', detail, statusCode)
        case 403:
            return new ForbiddenError(message, detail)
        case 404:
            return new NotFoundError(message, detail)
        case 409:
            return new ConflictError(message, detail)
        case 429:
            return new RateLimitError(message, retryAfter, detail)
        case 504:
            return new TimeoutError(message, detail)
        default:
            return new TaruviError(message, statusCode, code, detail, errors, data)
    }
}

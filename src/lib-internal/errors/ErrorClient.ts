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
    constructor(message = 'Authentication required') {
        super(message, 401, ErrorCode.UNAUTHORIZED)
        this.name = 'AuthError'
    }
}

export class ForbiddenError extends TaruviError {
    constructor(message = 'Permission denied') {
        super(message, 403, ErrorCode.FORBIDDEN)
        this.name = 'ForbiddenError'
    }
}

export class NotFoundError extends TaruviError {
    constructor(message = 'Resource not found') {
        super(message, 404, ErrorCode.NOT_FOUND)
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
    constructor(message = 'Request timeout') {
        super(message, 504, ErrorCode.GATEWAY_TIMEOUT)
        this.name = 'TimeoutError'
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
export function createErrorFromResponse(statusCode: number, body?: ErrorResponseBody): TaruviError {
    const message = body?.message || 'Request failed'
    const code = body?.code || ErrorCode.INTERNAL_ERROR
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
            return new AuthError(message)
        case 403:
            return new ForbiddenError(message)
        case 404:
            return new NotFoundError(message)
        case 409:
            return new ConflictError(message, detail)
        case 504:
            return new TimeoutError(message)
        default:
            return new TaruviError(message, statusCode, code, detail, errors, data)
    }
}

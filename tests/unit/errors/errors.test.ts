import { describe, it, expect } from 'vitest'
import {
    TaruviError,
    ValidationError,
    AuthError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    TimeoutError,
    NetworkError,
    RateLimitError,
    createErrorFromResponse,
    ErrorCode
} from '../../../src/lib-internal/errors/index.js'

describe('Error classes', () => {
    it('TaruviError has correct properties', () => {
        const err = new TaruviError('Something broke', 500, ErrorCode.INTERNAL_ERROR, 'db down', { field: 'bad' }, { extra: 1 })
        expect(err).toBeInstanceOf(Error)
        expect(err.name).toBe('TaruviError')
        expect(err.message).toBe('Something broke')
        expect(err.statusCode).toBe(500)
        expect(err.code).toBe('INTERNAL_ERROR')
        expect(err.detail).toBe('db down')
        expect(err.errors).toEqual({ field: 'bad' })
        expect(err.data).toEqual({ extra: 1 })
    })

    it('ValidationError defaults', () => {
        const err = new ValidationError()
        expect(err.name).toBe('ValidationError')
        expect(err.statusCode).toBe(400)
        expect(err.code).toBe('VALIDATION_ERROR')
        expect(err.message).toBe('Validation failed')
    })

    it('ValidationError with field errors', () => {
        const err = new ValidationError('Bad input', 'check fields', { email: 'required' })
        expect(err.errors).toEqual({ email: 'required' })
        expect(err.detail).toBe('check fields')
    })

    it('AuthError defaults', () => {
        const err = new AuthError()
        expect(err.name).toBe('AuthError')
        expect(err.statusCode).toBe(401)
        expect(err.code).toBe('UNAUTHORIZED')
    })

    it('ForbiddenError defaults', () => {
        const err = new ForbiddenError()
        expect(err.name).toBe('ForbiddenError')
        expect(err.statusCode).toBe(403)
        expect(err.code).toBe('FORBIDDEN')
    })

    it('NotFoundError defaults', () => {
        const err = new NotFoundError()
        expect(err.name).toBe('NotFoundError')
        expect(err.statusCode).toBe(404)
        expect(err.code).toBe('NOT_FOUND')
    })

    it('ConflictError defaults', () => {
        const err = new ConflictError()
        expect(err.name).toBe('ConflictError')
        expect(err.statusCode).toBe(409)
        expect(err.code).toBe('CONFLICT')
    })

    it('TimeoutError defaults', () => {
        const err = new TimeoutError()
        expect(err.name).toBe('TimeoutError')
        expect(err.statusCode).toBe(504)
        expect(err.code).toBe('GATEWAY_TIMEOUT')
    })

    it('NetworkError defaults', () => {
        const err = new NetworkError()
        expect(err.name).toBe('NetworkError')
        expect(err.statusCode).toBe(0)
        expect(err.code).toBe('NETWORK_ERROR')
    })

    it('RateLimitError defaults', () => {
        const err = new RateLimitError()
        expect(err.name).toBe('RateLimitError')
        expect(err.statusCode).toBe(429)
        expect(err.code).toBe('RATE_LIMITED')
        expect(err.retryAfter).toBeUndefined()
    })

    it('RateLimitError with retryAfter', () => {
        const err = new RateLimitError('Too many requests', 60)
        expect(err.message).toBe('Too many requests')
        expect(err.retryAfter).toBe(60)
        expect(err).toBeInstanceOf(TaruviError)
    })

    it('all errors are instanceof TaruviError', () => {
        expect(new ValidationError()).toBeInstanceOf(TaruviError)
        expect(new AuthError()).toBeInstanceOf(TaruviError)
        expect(new ForbiddenError()).toBeInstanceOf(TaruviError)
        expect(new NotFoundError()).toBeInstanceOf(TaruviError)
        expect(new ConflictError()).toBeInstanceOf(TaruviError)
        expect(new TimeoutError()).toBeInstanceOf(TaruviError)
        expect(new NetworkError()).toBeInstanceOf(TaruviError)
        expect(new RateLimitError()).toBeInstanceOf(TaruviError)
    })

    it('all errors are instanceof Error', () => {
        expect(new TaruviError('x', 500)).toBeInstanceOf(Error)
        expect(new ValidationError()).toBeInstanceOf(Error)
        expect(new NetworkError()).toBeInstanceOf(Error)
    })
})

describe('createErrorFromResponse', () => {
    it('400 with VALIDATION_ERROR code returns ValidationError', () => {
        const err = createErrorFromResponse(400, {
            status: 'error',
            code: 'VALIDATION_ERROR',
            message: 'Email is required',
            errors: { email: 'This field is required' }
        })
        expect(err).toBeInstanceOf(ValidationError)
        expect(err.message).toBe('Email is required')
        expect(err.errors).toEqual({ email: 'This field is required' })
    })

    it('400 with BAD_REQUEST code returns TaruviError', () => {
        const err = createErrorFromResponse(400, {
            status: 'error',
            code: 'BAD_REQUEST',
            message: 'Invalid input'
        })
        expect(err).toBeInstanceOf(TaruviError)
        expect(err).not.toBeInstanceOf(ValidationError)
        expect(err.code).toBe('BAD_REQUEST')
    })

    it('401 returns AuthError', () => {
        const err = createErrorFromResponse(401, {
            status: 'error',
            code: 'UNAUTHORIZED',
            message: 'Token expired'
        })
        expect(err).toBeInstanceOf(AuthError)
        expect(err.message).toBe('Token expired')
    })

    it('403 returns ForbiddenError', () => {
        const err = createErrorFromResponse(403, {
            status: 'error',
            code: 'FORBIDDEN',
            message: 'Not allowed'
        })
        expect(err).toBeInstanceOf(ForbiddenError)
    })

    it('404 returns NotFoundError', () => {
        const err = createErrorFromResponse(404, {
            status: 'error',
            code: 'NOT_FOUND',
            message: 'User not found'
        })
        expect(err).toBeInstanceOf(NotFoundError)
        expect(err.message).toBe('User not found')
    })

    it('409 returns ConflictError', () => {
        const err = createErrorFromResponse(409, {
            status: 'error',
            code: 'CONFLICT',
            message: 'Duplicate entry',
            detail: 'Email already exists'
        })
        expect(err).toBeInstanceOf(ConflictError)
        expect(err.detail).toBe('Email already exists')
    })

    it('504 returns TimeoutError', () => {
        const err = createErrorFromResponse(504, {
            status: 'error',
            code: 'GATEWAY_TIMEOUT',
            message: 'Query timeout'
        })
        expect(err).toBeInstanceOf(TimeoutError)
    })

    it('keeps detail on 401, 403, 404, and 504 errors', () => {
        for (const status of [401, 403, 404, 504]) {
            const err = createErrorFromResponse(status, {
                status: 'error',
                code: 'X',
                message: 'Failed',
                detail: 'More context'
            })
            expect(err.statusCode).toBe(status)
            expect(err.detail).toBe('More context')
        }
    })

    it('maps expired sessions (410, 419) to AuthError with their status', () => {
        for (const status of [410, 419]) {
            const err = createErrorFromResponse(status, undefined)
            expect(err).toBeInstanceOf(AuthError)
            expect(err.statusCode).toBe(status)
            expect(err.message).toBe('Session expired')
        }
    })

    it('429 carries the Retry-After delay', () => {
        const err = createErrorFromResponse(429, {
            status: 'error',
            code: 'RATE_LIMITED',
            message: 'Too many requests'
        }, 30)
        expect(err).toBeInstanceOf(RateLimitError)
        expect((err as RateLimitError).retryAfter).toBe(30)
    })

    it('429 returns RateLimitError', () => {
        const err = createErrorFromResponse(429, {
            status: 'error',
            code: 'RATE_LIMITED',
            message: 'Too many requests'
        })
        expect(err).toBeInstanceOf(RateLimitError)
        expect(err.message).toBe('Too many requests')
    })

    it('500 returns TaruviError', () => {
        const err = createErrorFromResponse(500, {
            status: 'error',
            code: 'INTERNAL_ERROR',
            message: 'Server error'
        })
        expect(err).toBeInstanceOf(TaruviError)
        expect(err.statusCode).toBe(500)
    })

    it('handles missing body', () => {
        const err = createErrorFromResponse(500, undefined)
        expect(err).toBeInstanceOf(TaruviError)
        expect(err.message).toBe('Request failed')
    })

    it('handles body with extra data field', () => {
        const err = createErrorFromResponse(400, {
            status: 'error',
            code: 'BAD_REQUEST',
            message: 'Bad',
            data: { hint: 'check params' }
        })
        expect(err.data).toEqual({ hint: 'check params' })
    })

    it('handles unknown status code', () => {
        const err = createErrorFromResponse(422, {
            status: 'error',
            code: 'VALIDATION_ERROR',
            message: 'Unprocessable'
        })
        expect(err).toBeInstanceOf(TaruviError)
        expect(err.statusCode).toBe(422)
    })
})

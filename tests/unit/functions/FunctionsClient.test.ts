import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Functions } from '../../../src/lib/functions/FunctionsClient.js'
import { Client } from '../../../src/client.js'

const mockHttpClient = {
    post: vi.fn()
}

const mockClient = {
    getConfig: () => ({ apiKey: 'test-key', appSlug: 'test-app', apiUrl: 'https://api.test.com' }),
    httpClient: mockHttpClient
} as unknown as Client

describe('Functions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('execute()', () => {
        it('executes function with default options', async () => {
            const response = { data: { result: 'success' } }
            mockHttpClient.post.mockResolvedValue(response)

            const functions = new Functions(mockClient)
            const result = await functions.execute('my-function')

            expect(mockHttpClient.post).toHaveBeenCalledWith(
                'api/apps/test-app/functions/my-function/execute/',
                { params: {} }
            )
            expect(result).toEqual(response)
        })

        it('executes function with params', async () => {
            const response = { data: { result: 'success' } }
            mockHttpClient.post.mockResolvedValue(response)

            const functions = new Functions(mockClient)
            await functions.execute('my-function', {
                params: { key1: 'value1', key2: 123 }
            })

            expect(mockHttpClient.post).toHaveBeenCalledWith(
                'api/apps/test-app/functions/my-function/execute/',
                { params: { key1: 'value1', key2: 123 } }
            )
        })

        it('executes function asynchronously', async () => {
            const response = {
                invocation: {
                    invocation_id: 'inv-123',
                    celery_task_id: 'task-456',
                    status: 'pending'
                }
            }
            mockHttpClient.post.mockResolvedValue(response)

            const functions = new Functions(mockClient)
            const result = await functions.execute('long-task', { async: true })

            expect(mockHttpClient.post).toHaveBeenCalledWith(
                'api/apps/test-app/functions/long-task/execute/',
                { async: true, params: {} }
            )
            expect(result).toEqual(response)
        })

        it('executes function with async and params', async () => {
            mockHttpClient.post.mockResolvedValue({})

            const functions = new Functions(mockClient)
            await functions.execute('process-data', {
                async: true,
                params: { data: 'test-data' }
            })

            expect(mockHttpClient.post).toHaveBeenCalledWith(
                'api/apps/test-app/functions/process-data/execute/',
                { async: true, params: { data: 'test-data' } }
            )
        })

        it('supports typed response', async () => {
            interface MyResponse {
                total: number
                items: string[]
            }
            const response = { data: { total: 5, items: ['a', 'b', 'c'] } }
            mockHttpClient.post.mockResolvedValue(response)

            const functions = new Functions(mockClient)
            const result = await functions.execute<MyResponse>('get-items')

            expect(result.data?.total).toBe(5)
            expect(result.data?.items).toEqual(['a', 'b', 'c'])
        })
    })
})

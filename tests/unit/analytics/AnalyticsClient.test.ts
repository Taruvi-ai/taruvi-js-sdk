import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Analytics } from '../../../src/lib/analytics/AnalyticsClient.js'
import { Client } from '../../../src/client.js'

const mockHttpClient = {
    post: vi.fn()
}

const mockClient = {
    getConfig: () => ({ apiKey: 'test-key', appSlug: 'test-app', apiUrl: 'https://api.test.com' }),
    httpClient: mockHttpClient
} as unknown as Client

describe('Analytics', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('execute()', () => {
        it('executes analytics query with default options', async () => {
            const response = { data: { total_sales: 1000 } }
            mockHttpClient.post.mockResolvedValue(response)

            const analytics = new Analytics(mockClient)
            const result = await analytics.execute('sales-report')

            expect(mockHttpClient.post).toHaveBeenCalledWith(
                'api/apps/test-app/analytics/queries/sales-report/execute/',
                { params: {} }
            )
            expect(result).toEqual(response)
        })

        it('executes analytics query with params', async () => {
            const response = { data: { total_sales: 5000 } }
            mockHttpClient.post.mockResolvedValue(response)

            const analytics = new Analytics(mockClient)
            await analytics.execute('monthly-report', {
                params: {
                    start_date: '2024-01-01',
                    end_date: '2024-12-31'
                }
            })

            expect(mockHttpClient.post).toHaveBeenCalledWith(
                'api/apps/test-app/analytics/queries/monthly-report/execute/',
                {
                    params: {
                        start_date: '2024-01-01',
                        end_date: '2024-12-31'
                    }
                }
            )
        })

        it('supports typed response', async () => {
            interface SalesData {
                total_sales: number
                orders_count: number
            }
            const response = { data: { total_sales: 10000, orders_count: 50 } }
            mockHttpClient.post.mockResolvedValue(response)

            const analytics = new Analytics(mockClient)
            const result = await analytics.execute<SalesData>('sales-summary')

            expect(result.data?.total_sales).toBe(10000)
            expect(result.data?.orders_count).toBe(50)
        })

        it('builds correct URL with app slug and query slug', async () => {
            mockHttpClient.post.mockResolvedValue({})

            const analytics = new Analytics(mockClient)
            await analytics.execute('dashboard-metrics')

            expect(mockHttpClient.post).toHaveBeenCalledWith(
                'api/apps/test-app/analytics/queries/dashboard-metrics/execute/',
                expect.any(Object)
            )
        })
    })
})

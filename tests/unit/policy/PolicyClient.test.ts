import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Policy } from '../../../src/lib/policy/PolicyClient.js'
import { Client } from '../../../src/client.js'

const mockHttpClient = {
    post: vi.fn()
}

const mockClient = {
    getConfig: () => ({ apiKey: 'test-key', appSlug: 'test-app', apiUrl: 'https://api.test.com' }),
    httpClient: mockHttpClient
} as unknown as Client

describe('Policy', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('checkResource()', () => {
        it('checks permissions for single resource', async () => {
            const response = { results: [{ actions: { read: 'EFFECT_ALLOW' } }] }
            mockHttpClient.post.mockResolvedValue(response)

            const policy = new Policy(mockClient)
            const result = await policy.checkResource([
                {
                    resource: 'crm:accounts',
                    recordId: 'record-123',
                    attributes: { owner_id: 'user-456' },
                    actions: ['read']
                }
            ])

            expect(mockHttpClient.post).toHaveBeenCalledWith(
                'api/apps/test-app/check/resources/',
                {
                    resources: [{
                        resource: {
                            kind: 'crm:accounts',
                            id: 'record-123',
                            attr: { owner_id: 'user-456' }
                        },
                        actions: ['read']
                    }]
                }
            )
            expect(result).toEqual(response)
        })

        it('checks permissions for multiple resources', async () => {
            const response = {
                results: [
                    { actions: { read: 'EFFECT_ALLOW', update: 'EFFECT_ALLOW' } },
                    { actions: { delete: 'EFFECT_DENY' } }
                ]
            }
            mockHttpClient.post.mockResolvedValue(response)

            const policy = new Policy(mockClient)
            await policy.checkResource([
                {
                    resource: 'crm:accounts',
                    recordId: 'acc-1',
                    attributes: {},
                    actions: ['read', 'update']
                },
                {
                    resource: 'docs:documents',
                    recordId: 'doc-1',
                    attributes: {},
                    actions: ['delete']
                }
            ])

            expect(mockHttpClient.post).toHaveBeenCalledWith(
                'api/apps/test-app/check/resources/',
                {
                    resources: [
                        {
                            resource: { kind: 'crm:accounts', id: 'acc-1', attr: {} },
                            actions: ['read', 'update']
                        },
                        {
                            resource: { kind: 'docs:documents', id: 'doc-1', attr: {} },
                            actions: ['delete']
                        }
                    ]
                }
            )
        })

        it('handles empty attributes', async () => {
            mockHttpClient.post.mockResolvedValue({ results: [] })

            const policy = new Policy(mockClient)
            await policy.checkResource([
                {
                    resource: 'crm:contacts',
                    recordId: 'contact-1',
                    attributes: {},
                    actions: ['read']
                }
            ])

            const body = mockHttpClient.post.mock.calls[0][1]
            expect(body.resources[0].resource.attr).toEqual({})
        })
    })

    describe('getAllowedActions()', () => {
        it('returns allowed actions for resource', async () => {
            const response = {
                results: [{
                    actions: {
                        read: 'EFFECT_ALLOW',
                        write: 'EFFECT_ALLOW',
                        delete: 'EFFECT_DENY'
                    }
                }]
            }
            mockHttpClient.post.mockResolvedValue(response)

            const policy = new Policy(mockClient)
            const result = await policy.getAllowedActions(
                { kind: 'datatable:users', id: '123', attr: {} }
            )

            expect(result).toContain('read')
            expect(result).toContain('write')
            expect(result).not.toContain('delete')
        })

        it('uses default actions when not specified', async () => {
            mockHttpClient.post.mockResolvedValue({ results: [{ actions: {} }] })

            const policy = new Policy(mockClient)
            await policy.getAllowedActions({ kind: 'test:table', id: '1', attr: {} })

            const body = mockHttpClient.post.mock.calls[0][1]
            expect(body.resources[0].actions).toEqual(['read', 'write', 'create', 'update', 'delete'])
        })

        it('uses custom actions when specified', async () => {
            mockHttpClient.post.mockResolvedValue({ results: [{ actions: {} }] })

            const policy = new Policy(mockClient)
            await policy.getAllowedActions(
                { kind: 'test:table', id: '1', attr: {} },
                { actions: ['read', 'update'] }
            )

            const body = mockHttpClient.post.mock.calls[0][1]
            expect(body.resources[0].actions).toEqual(['read', 'update'])
        })

        it('returns empty array when no results', async () => {
            mockHttpClient.post.mockResolvedValue({ results: [] })

            const policy = new Policy(mockClient)
            const result = await policy.getAllowedActions(
                { kind: 'test:table', id: '1', attr: {} }
            )

            expect(result).toEqual([])
        })

        it('includes principal when provided', async () => {
            mockHttpClient.post.mockResolvedValue({ results: [{ actions: {} }] })

            const policy = new Policy(mockClient)
            await policy.getAllowedActions(
                { kind: 'test:table', id: '1', attr: {} },
                { principal: { id: 'user-1', roles: ['admin'], attr: {} } }
            )

            const body = mockHttpClient.post.mock.calls[0][1]
            expect(body.principal).toEqual({ id: 'user-1', roles: ['admin'], attr: {} })
        })
    })
})

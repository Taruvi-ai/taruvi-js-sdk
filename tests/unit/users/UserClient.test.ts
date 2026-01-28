import { describe, it, expect, vi, beforeEach } from 'vitest'
import { User } from '../../../src/lib/users/UserClient.js'
import { Client } from '../../../src/client.js'

const mockHttpClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
}

const mockClient = {
    getConfig: () => ({ apiKey: 'test-key', appSlug: 'test-app', apiUrl: 'https://api.test.com' }),
    httpClient: mockHttpClient
} as unknown as Client

describe('User', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('getUser()', () => {
        it('fetches user by username', async () => {
            const userData = { username: 'john_doe', email: 'john@example.com' }
            mockHttpClient.get.mockResolvedValue(userData)

            const user = new User(mockClient)
            const result = await user.getUser('john_doe')

            expect(mockHttpClient.get).toHaveBeenCalledWith('api/users/john_doe/')
            expect(result).toEqual(userData)
        })
    })

    describe('createUser()', () => {
        it('creates user with provided data', async () => {
            const createData = {
                username: 'new_user',
                email: 'new@example.com',
                password: 'pass123',
                confirm_password: 'pass123',
                first_name: 'New',
                last_name: 'User',
                is_active: true,
                is_staff: false,
                attributes: ''
            }
            const response = { id: '1', ...createData }
            mockHttpClient.post.mockResolvedValue(response)

            const user = new User(mockClient)
            const result = await user.createUser(createData)

            expect(mockHttpClient.post).toHaveBeenCalledWith('api/users/', createData)
            expect(result).toEqual(response)
        })
    })

    describe('updateUser()', () => {
        it('updates user by username', async () => {
            const updateData = { email: 'updated@example.com', first_name: 'Updated' }
            const response = { username: 'john_doe', ...updateData }
            mockHttpClient.put.mockResolvedValue(response)

            const user = new User(mockClient)
            const result = await user.updateUser('john_doe', updateData)

            expect(mockHttpClient.put).toHaveBeenCalledWith('api/users/john_doe/', updateData)
            expect(result).toEqual(response)
        })
    })

    describe('deleteUser()', () => {
        it('deletes user by username', async () => {
            mockHttpClient.delete.mockResolvedValue(undefined)

            const user = new User(mockClient)
            await user.deleteUser('john_doe')

            expect(mockHttpClient.delete).toHaveBeenCalledWith('api/users/john_doe/')
        })
    })

    describe('list()', () => {
        it('lists users with filters', async () => {
            const users = [{ username: 'user1' }, { username: 'user2' }]
            mockHttpClient.get.mockResolvedValue(users)

            const user = new User(mockClient)
            const result = await user.list({ search: 'john', is_active: true, page: 1, page_size: 20 })

            expect(mockHttpClient.get).toHaveBeenCalledWith(
                expect.stringContaining('api/users/')
            )
            expect(result).toEqual(users)
        })

        it('builds query string from filters', async () => {
            mockHttpClient.get.mockResolvedValue([])

            const user = new User(mockClient)
            await user.list({ search: 'test', ordering: '-date_joined' })

            const url = mockHttpClient.get.mock.calls[0][0]
            expect(url).toContain('search=test')
            expect(url).toContain('ordering=-date_joined')
        })
    })

    describe('getUserApps()', () => {
        it('fetches apps for user', async () => {
            const apps = [{ name: 'App1', slug: 'app1' }, { name: 'App2', slug: 'app2' }]
            mockHttpClient.get.mockResolvedValue(apps)

            const user = new User(mockClient)
            const result = await user.getUserApps('john_doe')

            expect(mockHttpClient.get).toHaveBeenCalledWith('api/users/john_doe/apps/')
            expect(result).toEqual(apps)
        })
    })

    describe('assignRoles()', () => {
        it('assigns roles to user', async () => {
            const request = { username: 'john_doe', roles: ['admin', 'editor'] }
            const response = { success: true }
            mockHttpClient.post.mockResolvedValue(response)

            const user = new User(mockClient)
            const result = await user.assignRoles(request)

            expect(mockHttpClient.post).toHaveBeenCalledWith('api/assign/roles/', request)
            expect(result).toEqual(response)
        })
    })

    describe('revokeRoles()', () => {
        it('revokes roles from user', async () => {
            const request = { username: 'john_doe', roles: ['admin'] }
            const response = { success: true }
            mockHttpClient.delete.mockResolvedValue(response)

            const user = new User(mockClient)
            const result = await user.revokeRoles(request)

            expect(mockHttpClient.delete).toHaveBeenCalledWith('api/revoke/roles/', request)
            expect(result).toEqual(response)
        })
    })
})

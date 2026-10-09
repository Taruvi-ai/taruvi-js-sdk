import type { AppSettingsData, SecretData, SecretsBatchResponse, SecretsBatchMetadataResponse, StorageDeleteBatchResponse } from '../../src/index.js'

const value = { scope: 'app', answer: 42 } satisfies SecretData['value']
const batch = { status: 'success', message: 'done', data: { JSON_SECRET: value } } satisfies SecretsBatchResponse
const metadata = { status: 'success', message: 'done', data: { JSON_SECRET: {
    value, tags: ['sdk-live'], secret_type: 'SDK live JSON', sensitivity_level: 'private',
} } } satisfies SecretsBatchMetadataResponse
const settings = {
    display_name: 'SDK live settings', icon: null, icon_url: null,
    primary_color: '#1976d2', secondary_color: '#9c27b0', icon_background_color: '#ffffff',
    category: 'general', documentation_url: null, support_email: null,
    default_frontend_worker_url: null, default_frontend_worker_slug: null,
    created_at: '2026-10-04T00:00:00Z', updated_at: '2026-10-04T00:00:00Z',
} satisfies AppSettingsData
const slug: string | null = settings.default_frontend_worker_slug
void [value, batch, metadata, settings, slug]

const partialDelete = { status: 'success', message: 'Deleted 1 of 2 objects', data: {
    deleted_count: 1, message: 'Deleted 1 of 2 objects', failed: [{ path: 'missing.txt', error: 'Object not found' }],
} } satisfies StorageDeleteBatchResponse
const nothingFound = { status: 'error', message: 'No objects were deleted', data: {
    deleted_count: 0, failed: [{ path: 'missing.txt', error: 'Object not found' }],
} } satisfies StorageDeleteBatchResponse
void [partialDelete, nothingFound]

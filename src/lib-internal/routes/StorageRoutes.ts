export const StorageRoutes = {
    baseUrl: (appslug: string, bucket: string) => `api/apps/${appslug}/storage/buckets/${bucket}/objects`,
    // Encode per-segment so slashes stay as real path separators (required by Django's <path:key>).
    path: (path: string) => "/" + path.split('/').map(encodeURIComponent).join('/'),
    upload: () => "/batch-upload",
    delete: () => "/batch-delete",
    browse: () => "/browse",
}

export type StoragePathKey = 'path'
export type StorageFlagKey = 'upload' | 'delete' | 'browse'
export type StorageRouteKey = StoragePathKey | StorageFlagKey

export type BucketUrlParams = Partial<
    Record<StorageRouteKey, string | true>
>
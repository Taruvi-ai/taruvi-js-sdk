export const StorageRoutes = {
    baseUrl: (appslug: string, bucket: string) => `api/apps/${appslug}/storage/buckets/${bucket}/objects`,
    path: (path: string) => "/" + encodeURIComponent(path),
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
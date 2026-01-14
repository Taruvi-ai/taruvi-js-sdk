export const StorageRoutes = {
    baseUrl: (appslug: string, bucket: string) => `api/apps/${appslug}/storage/buckets/${bucket}/objects`,
    path: (path: string) => "/" + encodeURIComponent(path),
    upload: () => "/batch-upload",
    delete: () => "/batch-delete"
    // bucket: (appslug: string, bucketslug: string) => `${StorageRoutesClone.baseUrl(appslug)}/${bucketslug}`
}

export type StoragePathKey = 'path'
export type StorageFlagKey = 'upload' | 'delete'
export type StorageRouteKey = StoragePathKey | StorageFlagKey

export type BucketUrlParams = Partial<
    Record<StorageRouteKey, string | true>
>
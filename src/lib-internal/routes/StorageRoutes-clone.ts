export const StorageRoutesClone = {
    baseUrl: (appslug: string, bucket: string) => `api/apps/${appslug}/storage/buckets/${bucket}/objects`,
    path: (path: string) => "/"+path,
    upload: "/batch-upload",
    delete: "/batch-delete"
    // bucket: (appslug: string, bucketslug: string) => `${StorageRoutesClone.baseUrl(appslug)}/${bucketslug}`
}
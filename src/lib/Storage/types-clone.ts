export interface BucketUrlParams {
    appSlug: string
    bucket: string
    path?: string | undefined
}

export interface BucketFileUpload {
    file: File
    paths: []
    metadata?: []
}
export interface FunctionRequest {
    async?: boolean
    params?: Record<string, unknown>
}

export interface FunctionInvocation {
    invocation_id: number
    celery_task_id: string
    status: string
    created_at: string
    updated_at: string
}

export interface FunctionResponse<T = unknown> {
    data: T | null
    invocation: FunctionInvocation
}

export interface FunctionRequest {
    async?: boolean
    params?: Record<string, unknown>
}

export interface FunctionInvocation {
    id: number
    celery_task_id: string
    function: number
    function_name: string
    function_slug: string
    user_username: string
    task_status: string
    trigger_type: string
    created_at: string
    updated_at?: string
}

// Response type - matches backend AppDataResponse with invocation
export interface FunctionResponse<T = unknown> {
    status: "success" | "error"
    message: string
    data: T | null
    invocation: FunctionInvocation
}

export interface FunctionRequest {
    async?: boolean
    params?: Record<string, unknown>
}

/** Retained Celery metadata nested under an invocation; absence is not a task status. */
export interface FunctionTaskResult {
    task_id: string
    status: string
    result: unknown
    traceback: string | null
    task_args: unknown
    task_kwargs: unknown
    task_name: string | null
    date_created: string | null
    date_done: string | null
    worker: string | null
    meta: unknown
}

/** FunctionInvocationRecordSerializer: detail includes logs, lists omit them. */
export interface FunctionInvocation {
    id: number
    celery_task_id: string
    function: number
    function_name: string
    function_slug: string
    user_id: string | null
    user_username: string | null
    user_email: string | null
    task_result: FunctionTaskResult | null
    trigger_type: string
    history_id: number | null
    logs?: Record<string, unknown>[] | null
    log_count: number
    has_error: boolean
    created_at: string | null
    updated_at: string | null
    /** Available only from a function's execution-detail endpoint. */
    executed_code?: string | null
}

/** Execute returns the full AppDataResponse envelope, not just invocation metadata. */
export interface FunctionResponse<T = unknown> {
    status: "success" | "error"
    message: string
    /** Async acknowledgements and normalized None results use []; other runs return T. */
    data: T | [] | null
    invocation: FunctionInvocation
    /** True for an asynchronous acknowledgement, even if the task already finished. */
    queued?: boolean
    success?: boolean
}

import type { FunctionInvocation, FunctionResponse } from '../../src/index.js';

const invocation = {
  "id": 42,
  "function": 17,
  "function_name": "count_items",
  "function_slug": "count-items",
  "celery_task_id": "task-42",
  "trigger_type": "api",
  "user_id": null,
  "user_username": null,
  "user_email": null,
  "task_result": {
    "task_id": "task-42",
    "status": "SUCCESS",
    "result": {
      "result": false,
      "success": true
    },
    "traceback": null,
    "task_args": {
      "dry_run": false
    },
    "task_kwargs": {},
    "task_name": "functions.execute",
    "date_created": "2026-10-03T12:00:00Z",
    "date_done": "2026-10-03T12:00:00Z",
    "worker": null,
    "meta": {}
  },
  "history_id": null,
  "logs": [
    {
      "timestamp": "2026-10-03T12:00:00+00:00",
      "level": "INFO",
      "logger": "stdout",
      "message": "completed"
    }
  ],
  "log_count": 1,
  "has_error": false,
  "created_at": "2026-10-03T12:00:00Z",
  "updated_at": "2026-10-03T12:00:00Z"
} satisfies FunctionInvocation;
const sync = { status: 'success', message: 'done', data: false, invocation, queued: false } satisfies FunctionResponse<boolean>;
const queued = { status: 'success', message: 'accepted', data: [], invocation, queued: true, success: true } satisfies FunctionResponse<boolean>;
const functionId: number = invocation.function;
const email: string | null = invocation.user_email;
const taskStatus: string = invocation.task_result.status;
void [sync, queued, functionId, email, taskStatus];

export type BillingStatusCode = 200 | 402 | 429 | 503

export type BillingAccountStatus =
    | "setup_required"
    | "processing"
    | "active"
    | "internal"
    | "inactive"
    | "payment_required"

export interface BillingEntitlementsResponse {
    status?: string
    message?: string
    data?: Record<string, unknown>
    as_of?: string
    account_status?: BillingAccountStatus
    unavailable?: boolean
    enforced_modules?: string[]
}

export interface BillingGateError {
    statusCode: BillingStatusCode
    title: string
    message: string
    retryable: boolean
}

export type BillingCheckResult =
    | { status: "skipped" | "ok" }
    | { status: "billing_error"; error: BillingGateError }

export type BillingBody = Record<string, unknown>
export type BillingMessage = [string, string, boolean]

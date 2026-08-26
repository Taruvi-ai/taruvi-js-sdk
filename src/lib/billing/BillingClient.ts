import type { Client } from "../../client.js"
import { ACCOUNT_STATUS, ERROR_CODES, HEALTHY_ACCOUNT_STATUS } from "./constants.js"
import type {
    BillingBody,
    BillingCheckResult,
    BillingGateError,
    BillingMessage,
    BillingStatusCode,
    BillingEntitlementsResponse,
} from "./types.js"
import { bodyOf, textOf } from "./utils.js"

const createBillingError = (
    statusCode: BillingStatusCode,
    [title, fallback, retryable]: BillingMessage,
    body: BillingBody,
): BillingGateError => ({
    statusCode,
    title,
    message: textOf(body, "message") ?? textOf(body, "detail") ?? fallback,
    retryable,
})

export function getBillingError(statusCode: number, value: unknown): BillingGateError | null {
    const body = bodyOf(value)

    if (statusCode !== 200) {
        const message = ERROR_CODES[textOf(body, "code") ?? ""]
        return message ? createBillingError(statusCode as BillingStatusCode, message, body) : null
    }

    if (body.unavailable === true) {
        return createBillingError(200, ERROR_CODES.gate_unavailable!, {})
    }

    const accountStatus = textOf(body, "account_status")
    if (accountStatus && !HEALTHY_ACCOUNT_STATUS.includes(accountStatus)) {
        const message = ACCOUNT_STATUS[accountStatus]
        if (message) return createBillingError(200, message, {})
    }

    const data = bodyOf(body.data)
    const modules = Array.isArray(body.enforced_modules) ? body.enforced_modules : []
    const hasSuspendedModule = modules.some((module) => data[module as string] === "suspended")

    return hasSuspendedModule
        ? createBillingError(200, ERROR_CODES.product_suspended!, {})
        : null
}

export function getBillingErrorFromException(error: unknown): BillingGateError | null {
    const value = bodyOf(error)
    return typeof value.statusCode === "number"
        ? getBillingError(value.statusCode, { ...value, code: value.code ?? textOf(bodyOf(value.data), "code") })
        : null
}

export async function getBillingEntitlements(
    client: Client,
    organizationSlug?: string,
): Promise<BillingEntitlementsResponse | null> {
    if (!organizationSlug?.trim()) return null

    const endpoint = `api/cloud/organizations/${encodeURIComponent(organizationSlug)}/billing/entitlements/`
    return client.httpClient.get<BillingEntitlementsResponse>(endpoint)
}

export async function checkBilling(
    client: Client,
    organizationSlug?: string,
): Promise<BillingCheckResult> {
    if (!organizationSlug?.trim()) return { status: "skipped" }

    try {
        const body = await getBillingEntitlements(client, organizationSlug)
        const error = getBillingError(200, body)
        return error ? { status: "billing_error", error } : { status: "ok" }
    } catch (error) {
        const billingError = getBillingErrorFromException(error)
        return billingError ? { status: "billing_error", error: billingError } : { status: "skipped" }
    }
}

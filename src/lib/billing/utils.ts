import type { BillingBody } from "./types.js"

export const bodyOf = (value: unknown): BillingBody =>
    typeof value === "object" && value !== null ? value as BillingBody : {}

export const textOf = (body: BillingBody, key: string): string | undefined =>
    typeof body[key] === "string" ? body[key] : undefined

import type { BillingMessage } from "./types.js"

export const HEALTHY_ACCOUNT_STATUS = ["active", "internal"]

export const ACCOUNT_STATUS: Record<string, BillingMessage> = {
    setup_required: ["Billing setup required", "Contact an organization owner to complete billing setup.", false],
    processing: ["Billing setup in progress", "Billing setup is still being processed.", false],
    payment_required: ["Payment action required", "Ask an organization owner to update the payment method.", false],
    inactive: ["Subscription inactive", "Contact an organization owner to reactivate billing.", false],
}

export const ERROR_CODES: Record<string, BillingMessage> = {
    account_suspended: ["Billing action required", "This organization's billing is not active. Open Plans & billing to fix it, or contact the owner.", false],
    product_suspended: ["Usage limit reached", "You have used everything included in this billing period. Upgrade the plan to continue.", false],
    gate_unavailable: ["Billing check unavailable", "We could not verify billing access. Try again in a moment.", true],
}

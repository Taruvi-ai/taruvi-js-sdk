import type { TokenClient } from "./TokenClient.js"

// Everything hosted sign-in adds to the address fragment.
const SIGN_IN_FRAGMENT_PARAMS = ["session_token", "access_token", "refresh_token", "expires_in", "token_type"]

/**
 * Stores the session token that hosted sign-in put in the address fragment and
 * removes the sign-in values from the address bar, keeping any other fragment
 * content and the router's history state. Returns the token, or `null` when the
 * address carries none or this isn't a browser.
 */
export function captureSessionFromUrl(tokenClient: TokenClient, url?: string): string | null {
    if (typeof window === "undefined" || !window.location) return null

    const href = url ?? window.location.href
    const hashIndex = href.indexOf("#")
    if (hashIndex === -1) return null

    const params = new URLSearchParams(href.slice(hashIndex + 1))
    const sessionToken = params.get("session_token")
    if (!sessionToken) return null

    tokenClient.setTokens({ sessionToken })

    if (window.location.hash.includes("session_token") && window.history?.replaceState) {
        for (const key of SIGN_IN_FRAGMENT_PARAMS) params.delete(key)
        const rest = params.toString()
        const { pathname, search } = window.location
        window.history.replaceState(window.history.state, "", `${pathname}${search}${rest ? `#${rest}` : ""}`)
    }

    return sessionToken
}

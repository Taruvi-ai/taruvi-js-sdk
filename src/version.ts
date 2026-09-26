import packageJson from "../package.json" with { type: "json" };
import { getRuntimeEnvironment } from "./utils/utils.js";

export const SDK_VERSION: string = packageJson.version

/** Sent as X-Taruvi-Client so the platform can tell which SDK and version called it. */
export function clientIdentifier(): string {
    const runtime = getRuntimeEnvironment().replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
    return `taruvi-js/${SDK_VERSION} (${runtime})`
}

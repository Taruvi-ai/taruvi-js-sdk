import { readFileSync } from 'node:fs'
import { Client } from '../../src/index.js'

export interface LiveFixture {
    kind: 'taruvi-sdk-live-fixture-v1'
    fixture_id: string
    disposable: true
    api_url: string
    app_slug: string
    resources: {
        user: { id: string; username: string; email: string }
        other_app_slug: string
        app_settings: { display_name: string; primary_color: string }
        other_app_settings: { display_name: string; primary_color: string }
        database: { table_name: string; vector_table_name: string }
        storage: { bucket_slug: string; prefix: string }
        functions: { function_slug: string; output_mode: 'echo' }
        analytics: { query_slug: string }
        secrets: {
            shadowed_key: string; site_only_key: string
            site_value: Record<string, unknown>; app_value: Record<string, unknown>
            secret_type_slug: string; secret_type_name: string; tag: string
        }
    }
}

export function readLiveFixture(environment: NodeJS.ProcessEnv = process.env): LiveFixture {
    if (environment.RUN_INTEGRATION_TESTS !== '1') throw new Error('Live requests require RUN_INTEGRATION_TESTS=1.')
    if (!environment.TARUVI_LIVE_FIXTURE_MANIFEST) throw new Error('Set TARUVI_LIVE_FIXTURE_MANIFEST to an owned fixture JSON file.')
    let fixture: LiveFixture
    try {
        fixture = JSON.parse(readFileSync(environment.TARUVI_LIVE_FIXTURE_MANIFEST, 'utf8'))
    } catch {
        throw new Error('Live fixture manifest must be readable JSON.')
    }
    if (fixture?.kind !== 'taruvi-sdk-live-fixture-v1' || fixture.disposable !== true || (typeof fixture.fixture_id !== 'string' || !fixture.fixture_id.startsWith('sdk-live-'))) {
        throw new Error('Live fixture manifest must identify an owned disposable SDK fixture.')
    }
    let url: URL
    try {
        url = new URL(fixture.api_url)
    } catch {
        throw new Error('Live fixture api_url must be an HTTP(S) site URL.')
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || !fixture.app_slug || !fixture.resources) {
        throw new Error('Live fixture requires app_slug/resources and an HTTP(S) URL without credentials, query or fragment.')
    }
    return fixture
}

export async function loginClient(fixture: LiveFixture): Promise<Client> {
    const email = process.env.TARUVI_TEST_EMAIL
    const password = process.env.TARUVI_TEST_PASSWORD
    if (!email || !password || email !== fixture.resources.user.email) {
        throw new Error('Set TARUVI_TEST_EMAIL and TARUVI_TEST_PASSWORD for the owned fixture user.')
    }
    let response: Response
    try {
        response = await fetch(`${fixture.api_url.replace(/\/+$/, '')}/_allauth/app/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            signal: AbortSignal.timeout(10_000),
        })
    } catch {
        throw new Error('Owned fixture login could not reach the configured backend.')
    }
    if (!response.ok) throw new Error(`Owned fixture login returned HTTP ${response.status}.`)
    let data: { meta?: { session_token?: unknown } }
    try {
        data = await response.json()
    } catch {
        throw new Error('Owned fixture login returned invalid JSON.')
    }
    const token = data?.meta?.session_token
    if (typeof token !== 'string' || !token) throw new Error('Owned fixture login is missing meta.session_token.')
    return new Client({ apiUrl: fixture.api_url, appSlug: fixture.app_slug, token, detectSessionInUrl: false })
}

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { readLiveFixture } from '../../live/fixture.js'

it.each([undefined, '', '0', 'false', 'off'])('refuses fixture access without exact opt-in %s', (optIn) => {
    expect(() => readLiveFixture({ RUN_INTEGRATION_TESTS: optIn })).toThrow('Live requests require RUN_INTEGRATION_TESTS=1')
})

it('fails enabled missing configuration and unsafe ownership without making requests', () => {
    expect(() => readLiveFixture({ RUN_INTEGRATION_TESTS: '1' })).toThrow('TARUVI_LIVE_FIXTURE_MANIFEST')
    const directory = mkdtempSync(join(tmpdir(), 'taruvi-sdk-manifest-'))
    const path = join(directory, 'fixture.json')
    const environment = { RUN_INTEGRATION_TESTS: '1', TARUVI_LIVE_FIXTURE_MANIFEST: path }
    try {
        writeFileSync(path, 'not-json')
        expect(() => readLiveFixture(environment)).toThrow('readable JSON')
        const fixture = { kind: 'taruvi-sdk-live-fixture-v1', fixture_id: 'sdk-live-unit', disposable: false, api_url: 'https://example.invalid/sites/fixture/', app_slug: 'fixture', resources: {} }
        writeFileSync(path, JSON.stringify(fixture))
        expect(() => readLiveFixture(environment)).toThrow('owned disposable')
        writeFileSync(path, JSON.stringify({ ...fixture, disposable: true, api_url: 'https://user:private-password@example.invalid' }))
        expect(() => readLiveFixture(environment)).toThrow('without credentials')
        writeFileSync(path, JSON.stringify({ ...fixture, disposable: true }))
        expect(readLiveFixture(environment).fixture_id).toBe('sdk-live-unit')
    } finally {
        rmSync(directory, { recursive: true })
    }
})

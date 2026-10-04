import { defineConfig } from 'vitest/config'

if (process.env.RUN_INTEGRATION_TESTS !== '1') {
    throw new Error('Live SDK tests require RUN_INTEGRATION_TESTS=1 and an owned disposable fixture manifest.')
}

export default defineConfig({
    test: {
        include: ['tests/live/**/*.live.test.ts'],
        environment: 'node',
        testTimeout: 75_000,
        hookTimeout: 15_000,
        fileParallelism: false,
    },
})

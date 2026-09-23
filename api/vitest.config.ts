import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
    globalSetup: ['src/test/global-setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.spec.{ts,tsx}', 'src/generated/**', 'src/routeTree.gen.ts', 'src/test/**'],
      reporter: ['text-summary', 'json-summary', 'lcov'],
    },
  },
})

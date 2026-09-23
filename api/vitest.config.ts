import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
    globalSetup: ['src/test/global-setup.ts'],
  },
})

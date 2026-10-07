import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    // Railway's healthcheck doesn't always present the public domain as the
    // Host header, which made Vite's strict allowlist reject it with a 403
    // and fail the deploy. The app is only reachable through Railway's edge
    // proxy for its registered domain(s), so disabling the host check here
    // is safe.
    allowedHosts: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/polyfills.ts', './src/test/setup.ts'],
    pool: 'forks',
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})

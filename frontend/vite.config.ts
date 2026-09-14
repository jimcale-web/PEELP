import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    allowedHosts: ['peaceful-emotion-production-d146.up.railway.app'],
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

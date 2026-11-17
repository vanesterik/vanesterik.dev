import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // content/ stays at the root; every other @/ import lives in src/
      {
        find: /^@\/content\//,
        replacement: fileURLToPath(new URL('./content/', import.meta.url)),
      },
      {
        find: /^@\//,
        replacement: fileURLToPath(new URL('./src/', import.meta.url)),
      },
    ],
  },
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    // e2e/ holds Playwright's specs, which /unity:test runs on their own
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})

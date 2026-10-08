import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom has no ResizeObserver, which Headless UI uses to position its menus
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup()
})

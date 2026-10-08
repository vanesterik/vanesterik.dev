import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ThemeProvider, themeProviderProps, useTheme } from './theme-provider'

let theme: ReturnType<typeof useTheme>

const Probe = () => {
  theme = useTheme()
  return null
}

const renderProvider = () =>
  render(
    <ThemeProvider {...themeProviderProps}>
      <Probe />
    </ThemeProvider>,
  )

const stubSystemPreference = (isDark: boolean) => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: isDark,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }),
  )
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark', 'light')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ThemeProvider', () => {
  it('follows the system preference when nothing is stored', () => {
    stubSystemPreference(true)
    renderProvider()

    expect(theme.theme).toBe('system')
    expect(document.documentElement).toHaveClass('dark')
  })

  it('applies and remembers a chosen theme', () => {
    stubSystemPreference(false)
    renderProvider()

    act(() => theme.setTheme('dark'))

    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
  })
})

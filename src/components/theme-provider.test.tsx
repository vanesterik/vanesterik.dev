import { act, render } from '@testing-library/react'
import { useTheme } from 'next-themes'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ThemeProvider } from './theme-provider'

let theme: ReturnType<typeof useTheme>

const Probe = () => {
  theme = useTheme()
  return null
}

// Rendered without props, exactly as the root layout renders it: the site's
// settings must live in the provider, because a server component can't pass a
// value imported from this client module
const renderProvider = () =>
  render(
    <ThemeProvider>
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
  document.documentElement.removeAttribute('data-theme')
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

  it('lets a caller override the attribute, as the Storybook story does', () => {
    stubSystemPreference(false)
    render(
      <ThemeProvider attribute="data-theme">
        <Probe />
      </ThemeProvider>,
    )

    act(() => theme.setTheme('dark'))

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(document.documentElement).not.toHaveClass('dark')
  })
})

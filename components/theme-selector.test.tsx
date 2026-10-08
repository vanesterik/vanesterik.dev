import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ThemeProvider } from './theme-provider'
import { ThemeSelector } from './theme-selector'

const options = [
  { name: 'system', icon: 'snowflake' },
  { name: 'dark', icon: 'moon' },
  { name: 'light', icon: 'sun' },
]

const renderSelector = () =>
  render(
    <ThemeProvider>
      <ThemeSelector options={options} />
    </ThemeProvider>,
  )

beforeEach(() => {
  // jsdom has no matchMedia; report a light system preference
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  )
  document.documentElement.classList.remove('dark')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ThemeSelector', () => {
  it('shows the current theme on its button', () => {
    renderSelector()
    expect(screen.getByRole('button', { name: /system/i })).toBeInTheDocument()
  })

  it('applies the dark theme when dark is chosen', async () => {
    const user = userEvent.setup()
    renderSelector()

    await user.click(screen.getByRole('button', { name: /system/i }))
    await user.click(screen.getByRole('option', { name: /dark/i }))

    expect(document.documentElement).toHaveClass('dark')
  })

  it('applies the dark theme when dark is chosen by keyboard', async () => {
    const user = userEvent.setup()
    renderSelector()

    // ArrowDown opens the list on the current theme; the next one moves to dark
    screen.getByRole('button', { name: /system/i }).focus()
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{ArrowDown}{Enter}')

    expect(document.documentElement).toHaveClass('dark')
  })

  it('closes on Escape without changing the highlighted theme', async () => {
    const user = userEvent.setup()
    renderSelector()

    await user.click(screen.getByRole('button', { name: /system/i }))
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('closes on Escape without changing the theme', async () => {
    const user = userEvent.setup()
    renderSelector()

    await user.click(screen.getByRole('button', { name: /system/i }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(document.documentElement).not.toHaveClass('dark')
  })
})

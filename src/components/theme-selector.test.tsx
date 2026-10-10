import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ThemeSelector } from './theme-selector'

const setTheme = vi.fn()

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'system', setTheme }),
}))

const options = [
  { name: 'system', icon: 'settings' },
  { name: 'dark', icon: 'moon' },
  { name: 'light', icon: 'sun' },
]

beforeEach(() => {
  setTheme.mockClear()
})

describe('ThemeSelector', () => {
  it('shows the current theme on its button', () => {
    render(<ThemeSelector options={options} />)
    expect(screen.getByRole('button', { name: /system/i })).toBeInTheDocument()
  })

  it('hides the theme name visually below md, but not from screen readers', () => {
    render(<ThemeSelector options={options} />)
    const name = screen.getByText('system')
    expect(name).toHaveClass('max-md:sr-only')
    expect(screen.getByRole('button', { name: /system/i })).toContainElement(
      name,
    )
  })

  it('chooses a theme with the mouse', async () => {
    const user = userEvent.setup()
    render(<ThemeSelector options={options} />)

    await user.click(screen.getByRole('button', { name: /system/i }))
    await user.click(screen.getByRole('menuitemradio', { name: /dark/i }))

    expect(setTheme).toHaveBeenCalledWith('dark')
  })

  it('chooses a theme with the keyboard', async () => {
    const user = userEvent.setup()
    render(<ThemeSelector options={options} />)

    // Enter opens the menu on the first option; ArrowDown moves to dark
    screen.getByRole('button', { name: /system/i }).focus()
    await user.keyboard('{Enter}')
    await user.keyboard('{ArrowDown}{Enter}')

    expect(setTheme).toHaveBeenCalledWith('dark')
  })

  it('closes on Escape without choosing a theme', async () => {
    const user = userEvent.setup()
    render(<ThemeSelector options={options} />)

    await user.click(screen.getByRole('button', { name: /system/i }))
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(setTheme).not.toHaveBeenCalled()
  })

  it('shows each option with its Lucide icon', async () => {
    const user = userEvent.setup()
    render(<ThemeSelector options={options} />)

    await user.click(screen.getByRole('button', { name: /system/i }))

    for (const [name, icon] of [
      ['system', 'settings'],
      ['dark', 'moon'],
      ['light', 'sun'],
    ]) {
      const option = screen.getByRole('menuitemradio', { name })
      expect(option.querySelector(`svg.lucide-${icon}`)).not.toBeNull()
    }
  })
})

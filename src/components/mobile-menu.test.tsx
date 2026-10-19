import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MobileMenu } from './mobile-menu'

const items = [
  { name: 'van_esterik', url: '/' },
  { name: 'about', url: '/about' },
  { name: 'projects', url: '/projects' },
  { name: 'posts', url: '/posts' },
]

const pathname = vi.hoisted(() => ({ value: '/' }))

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.value,
}))

beforeEach(() => {
  pathname.value = '/'
})

describe('MobileMenu', () => {
  it('marks the current page in the menu', async () => {
    pathname.value = '/about/'
    const user = userEvent.setup()
    render(<MobileMenu items={items} />)

    await user.click(screen.getByRole('button', { name: 'menu' }))

    expect(screen.getByRole('menuitem', { name: 'about' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('menuitem', { name: 'posts' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('marks its section on a page below it', async () => {
    pathname.value = '/posts/a-post/'
    const user = userEvent.setup()
    render(<MobileMenu items={items} />)

    await user.click(screen.getByRole('button', { name: 'menu' }))

    expect(screen.getByRole('menuitem', { name: 'posts' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('keeps the current item readable on hover and focus', async () => {
    pathname.value = '/about/'
    const user = userEvent.setup()
    render(<MobileMenu items={items} />)

    await user.click(screen.getByRole('button', { name: 'menu' }))

    // The primary background must stay under the primary-foreground text
    const current = screen.getByRole('menuitem', { name: 'about' })
    expect(current).toHaveClass('hover:bg-primary/80', 'focus:bg-primary/80')
    expect(current).not.toHaveClass('hover:bg-accent')
    expect(current).not.toHaveClass('focus:bg-accent')
  })

  it('opens a menu that links to every page but home', async () => {
    const user = userEvent.setup()
    render(<MobileMenu items={items} />)

    await user.click(screen.getByRole('button', { name: 'menu' }))

    const links = screen.getAllByRole('menuitem')
    expect(links.map((link) => link.textContent)).toEqual([
      'about',
      'projects',
      'posts',
    ])
    expect(links[0]).toHaveAttribute('href', '/about')
  })

  it('opens with the keyboard', async () => {
    const user = userEvent.setup()
    render(<MobileMenu items={items} />)

    await user.tab()
    await user.keyboard('{Enter}')

    expect(screen.getByRole('menuitem', { name: 'posts' })).toBeInTheDocument()
  })

  it('renders nothing without pages besides home', () => {
    const { container } = render(<MobileMenu items={[items[0]]} />)
    expect(container).toBeEmptyDOMElement()
  })
})

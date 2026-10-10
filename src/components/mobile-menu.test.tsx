import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { MobileMenu } from './mobile-menu'

const items = [
  { name: 'van_esterik', url: '/' },
  { name: 'about', url: '/about' },
  { name: 'projects', url: '/projects' },
  { name: 'posts', url: '/posts' },
]

describe('MobileMenu', () => {
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

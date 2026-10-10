import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Navigation } from './navigation'

describe('Navigation', () => {
  it('renders the home link as a ghost button and the others as secondary', () => {
    render(
      <Navigation
        items={[
          { name: 'home', url: '/' },
          { name: 'about', url: '/about' },
        ]}
      />,
    )

    expect(screen.getByRole('link', { name: 'home' })).toHaveAttribute(
      'data-variant',
      'ghost',
    )
    expect(screen.getByRole('link', { name: 'about' })).toHaveAttribute(
      'data-variant',
      'secondary',
    )
    expect(screen.getByRole('link', { name: 'about' })).toHaveAttribute(
      'href',
      '/about',
    )
  })

  it('renders nothing without items', () => {
    const { container } = render(<Navigation items={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('leaves the page links to the menu below md, but always shows home', () => {
    render(
      <Navigation
        items={[
          { name: 'home', url: '/' },
          { name: 'about', url: '/about' },
        ]}
      />,
    )

    // The layout's MobileMenu holds the pages on narrow screens
    expect(
      screen.getByRole('link', { name: 'about' }).closest('li'),
    ).toHaveClass('max-md:hidden')
    expect(
      screen.getByRole('link', { name: 'home' }).closest('li'),
    ).not.toHaveClass('max-md:hidden')
  })
})

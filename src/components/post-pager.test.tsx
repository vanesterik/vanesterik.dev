import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PostPager } from './post-pager'

const previous = {
  slug: 'older-post',
  title: 'Older post',
  date: '2026-01-15',
}
const next = { slug: 'newer-post', title: 'Newer post', date: '2026-09-30' }

describe('PostPager', () => {
  it('is a navigation landmark named "More posts"', () => {
    render(<PostPager previous={previous} next={next} />)
    expect(
      screen.getByRole('navigation', { name: 'More posts' }),
    ).toBeInTheDocument()
  })

  it('shows Previous and then Next, each with its date and title', () => {
    render(<PostPager previous={previous} next={next} />)
    const [prev, nxt] = screen.getAllByRole('link')
    expect(prev).toHaveTextContent('← Previous · 15 JAN 2026')
    expect(prev).toHaveTextContent('Older post')
    expect(prev).toHaveAttribute('href', '/posts/older-post')
    expect(prev).toHaveAttribute('rel', 'prev')
    expect(nxt).toHaveTextContent('30 SEP 2026 · Next →')
    expect(nxt).toHaveTextContent('Newer post')
    expect(nxt).toHaveAttribute('href', '/posts/newer-post')
    expect(nxt).toHaveAttribute('rel', 'next')
  })

  it('has only Next on the oldest post, kept in the right column', () => {
    render(<PostPager next={next} />)
    expect(screen.queryByText(/Previous/)).not.toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveClass('sm:col-start-2')
  })

  it('has only Previous on the newest post', () => {
    render(<PostPager previous={previous} />)
    expect(screen.getByRole('link')).toHaveAttribute('rel', 'prev')
    expect(screen.queryByText(/Next/)).not.toBeInTheDocument()
  })

  it('renders nothing without neighbours', () => {
    const { container } = render(<PostPager />)
    expect(container).toBeEmptyDOMElement()
  })
})

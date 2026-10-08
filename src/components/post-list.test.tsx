import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PostList } from './post-list'

const posts = [
  {
    slug: 'newer-post',
    title: 'Newer post',
    date: '2026-09-30',
    description: 'The newer one.',
  },
  {
    slug: 'older-post',
    title: 'Older post',
    date: '2026-01-15',
    description: 'The older one.',
  },
]

describe('PostList', () => {
  it('links each title to its post, in the given order', () => {
    render(<PostList posts={posts} />)
    const links = screen.getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual([
      'Newer post',
      'Older post',
    ])
    // The build's trailingSlash setting adds the trailing slash
    expect(links[0]).toHaveAttribute('href', '/posts/newer-post')
  })

  it('shows the date and description of each post', () => {
    render(<PostList posts={posts} />)
    expect(screen.getByText('30 SEP 2026')).toBeInTheDocument()
    expect(screen.getByText('The older one.')).toBeInTheDocument()
  })

  it('says there are no posts yet when the list is empty', () => {
    render(<PostList posts={[]} />)
    expect(screen.getByText('no posts yet')).toBeInTheDocument()
  })
})

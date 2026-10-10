import { render, screen } from '@testing-library/react'
import type { Root } from 'hast'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PostContent } from './post-content'

const tree: Root = {
  type: 'root',
  children: [
    {
      type: 'element',
      tagName: 'p',
      properties: {},
      children: [{ type: 'text', value: 'Run this:' }],
    },
    {
      type: 'element',
      tagName: 'pre',
      properties: { className: ['shiki'] },
      children: [
        {
          type: 'element',
          tagName: 'code',
          properties: {},
          children: [{ type: 'text', value: 'ls -la' }],
        },
      ],
    },
  ],
}

afterEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    value: undefined,
    configurable: true,
  })
})

describe('PostContent', () => {
  it('renders the post and gives each code block a copy button', () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn() },
      configurable: true,
    })
    render(<PostContent tree={tree} />)

    expect(screen.getByText('Run this:')).toBeInTheDocument()
    expect(screen.getByText('ls -la').closest('pre')).toHaveClass('shiki')
    expect(
      screen.getByRole('button', { name: 'Copy code' }),
    ).toBeInTheDocument()
  })
})

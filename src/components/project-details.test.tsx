import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { Project } from '@/lib/projects'

import { ProjectDetails } from './project-details'

const project: Project = {
  slug: 'lorem',
  type: 'web',
  name: 'lorem',
  stack: ['next.js', 'mdx'],
  year: 2026,
  status: 'live',
  role: 'design + build',
  description: 'Lorem ipsum dolor sit amet.',
  preview: {},
  links: {
    primary: 'https://lorem.example.com',
    source: 'https://example.com/lorem',
    writeup: 'https://example.com/lorem/write-up',
  },
}

// The label and value of every pair in a definition list, in order
const pairs = (list: HTMLElement) =>
  [...list.querySelectorAll('dt')].map((term) => [
    term.textContent,
    term.nextElementSibling?.textContent,
  ])

describe('ProjectDetails', () => {
  it('leads with the description styled like a post title', () => {
    render(<ProjectDetails project={project} />)
    expect(screen.getByText('Lorem ipsum dolor sit amet.')).toHaveClass(
      'font-sans',
      'font-bold',
      'text-4xl',
      'sm:text-5xl',
      'leading-tight',
    )
  })

  it('lists the stack, role and year', () => {
    render(<ProjectDetails project={project} />)
    const [facts] = screen
      .getAllByRole('definition')
      .map((value) => value.closest('dl') as HTMLElement)
    expect(pairs(facts)).toEqual([
      ['stack', 'next.js · mdx'],
      ['role', 'design + build'],
      ['year', '2026'],
    ])
  })

  it.each([
    ['web', 'visit site'],
    ['cli', 'install'],
    ['lib', 'npm'],
    ['mcp', 'install'],
  ] as const)('lists the links of a %s project, by address', (type, label) => {
    const { container } = render(
      <ProjectDetails project={{ ...project, type }} />,
    )
    const links = container.querySelectorAll('dl')[1] as HTMLElement
    expect(pairs(links)).toEqual([
      [label, 'lorem.example.com'],
      ['source', 'example.com/lorem'],
      ['write-up', 'example.com/lorem/write-up'],
    ])
  })

  it('opens the links in a new tab', () => {
    render(<ProjectDetails project={project} />)
    expect(
      screen.getByRole('link', { name: 'lorem.example.com' }),
    ).toHaveAttribute('target', '_blank')
  })

  it('leaves out links without a URL', () => {
    const { container } = render(
      <ProjectDetails
        project={{ ...project, links: { source: 'https://example.com' } }}
      />,
    )
    expect(pairs(container.querySelectorAll('dl')[1] as HTMLElement)).toEqual([
      ['source', 'example.com'],
    ])
  })

  it('leaves out the links column without links', () => {
    const { container } = render(
      <ProjectDetails project={{ ...project, links: {} }} />,
    )
    expect(container.querySelectorAll('dl')).toHaveLength(1)
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })
})

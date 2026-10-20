import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Project } from '@/lib/projects'

import { openSlugFromPath, ProjectIndex } from './project-index'

const pathname = vi.hoisted(() => ({ value: null as string | null }))

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.value,
}))

const scrollIntoView = vi.fn()
let reducedMotion = false

beforeEach(() => {
  pathname.value = null
  reducedMotion = false
  scrollIntoView.mockClear()
  Element.prototype.scrollIntoView = scrollIntoView
  window.matchMedia = vi.fn((query: string) => ({
    matches: reducedMotion && query === '(prefers-reduced-motion: reduce)',
  })) as unknown as typeof window.matchMedia
  vi.restoreAllMocks()
})

const project = (overrides: Partial<Project>): Project => ({
  slug: 'lorem',
  type: 'web',
  name: 'lorem',
  stack: ['next.js', 'mdx'],
  year: 2026,
  status: 'live',
  role: 'author',
  description: 'Lorem ipsum.',
  preview: {},
  links: {},
  ...overrides,
})

// One project per kind of preview
const projects = [
  project({
    url: 'https://lorem.example.com',
    preview: { image: '/projects/lorem.jpg' },
    links: { primary: 'https://lorem.example.com' },
  }),
  project({
    slug: 'ipsum',
    type: 'cli',
    name: 'ipsum',
    preview: { terminal: [{ text: 'ipsum pack', tone: 'command' }] },
  }),
  project({
    slug: 'dolor',
    type: 'cli',
    name: 'dolor',
    preview: { image: '/projects/dolor.png', frame: 'terminal' },
  }),
  project({
    slug: 'sit',
    type: 'zsh',
    name: 'sit',
    description: 'Sit amet.',
  }),
]

const row = (name: RegExp) => screen.getByRole('button', { name })

describe('ProjectIndex', () => {
  it('lists every project collapsed', () => {
    render(<ProjectIndex projects={projects} />)
    const rows = screen.getAllByRole('button')
    expect(rows).toHaveLength(projects.length)
    for (const button of rows) {
      expect(button).toHaveAttribute('aria-expanded', 'false')
    }
  })

  it('names each row by its name, type, year and status, without the dot', () => {
    render(<ProjectIndex projects={projects} />)
    const lorem = row(/^lorem/)
    expect(lorem).toHaveAccessibleName(/^lorem\s*web\s*2026\s*live$/)
    expect(lorem).not.toHaveAccessibleName(/●/)
  })

  it('leaves the stack to the details', () => {
    render(<ProjectIndex projects={projects} />)
    expect(row(/^lorem/)).not.toHaveTextContent('next.js')
  })

  it('opens a row to its screenshot and details', async () => {
    const user = userEvent.setup()
    render(<ProjectIndex projects={projects} />)

    await user.click(row(/^lorem/))

    expect(row(/^lorem/)).toHaveAttribute('aria-expanded', 'true')
    expect(
      screen.getByRole('img', { name: 'Screenshot of lorem' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'lorem.example.com' }),
    ).toBeInTheDocument()
  })

  it('keeps one row open at a time, and closes an open row on a click', async () => {
    const user = userEvent.setup()
    render(<ProjectIndex projects={projects} />)

    await user.click(row(/^lorem/))
    await user.click(row(/^ipsum/))
    expect(row(/^lorem/)).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('zsh — ipsum')).toBeInTheDocument()

    await user.click(row(/^ipsum/))
    expect(row(/^ipsum/)).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('zsh — ipsum')).toBeNull()
  })

  it('shows the open row inverted, like the current page in the navigation', async () => {
    const user = userEvent.setup()
    render(<ProjectIndex projects={projects} />)

    await user.click(row(/^lorem/))

    const open = row(/^lorem/)
    expect(open).toHaveAttribute('data-state', 'open')
    expect(open).toHaveClass(
      'data-[state=open]:bg-primary',
      'data-[state=open]:text-primary-foreground',
      'data-[state=open]:hover:bg-primary/80',
    )
    // The type column stays toned down, in the row's own text color
    expect(screen.getAllByText('web')[0]).toHaveClass(
      'group-data-[state=open]:text-primary-foreground/60',
    )
  })

  it('sets the open row apart from the others', async () => {
    const user = userEvent.setup()
    render(<ProjectIndex projects={projects} />)

    await user.click(row(/^lorem/))

    const item = row(/^lorem/).closest('[data-slot="accordion-item"]')
    expect(item).toHaveAttribute('data-state', 'open')
    expect(item).toHaveClass('data-[state=open]:my-2')
  })

  it('shows a terminal app screenshot in the terminal frame', async () => {
    const user = userEvent.setup()
    render(<ProjectIndex projects={projects} />)

    await user.click(row(/^dolor/))

    // Without the browser frame's address bar
    const image = screen.getByRole('img', { name: 'Screenshot of dolor' })
    expect(image.closest('figure')?.textContent).toBe('')
  })

  it('shows no preview for a project without one', async () => {
    const user = userEvent.setup()
    render(<ProjectIndex projects={projects} />)

    await user.click(row(/^sit/))

    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.queryByText(/^zsh —/)).toBeNull()
    expect(screen.getByText('Sit amet.')).toBeInTheDocument()
  })
})

describe('openSlugFromPath', () => {
  const slugs = projects.map(({ slug }) => slug)

  it('takes the slug from a project path', () => {
    expect(openSlugFromPath('/projects/ipsum/', slugs)).toBe('ipsum')
    expect(openSlugFromPath('/projects/ipsum', slugs)).toBe('ipsum')
  })

  it('opens nothing for any other path', () => {
    for (const path of [
      '/projects/',
      '/projects/unknown/',
      '/projects/ipsum/extra/',
      '/',
      null,
    ]) {
      expect(openSlugFromPath(path, slugs)).toBe('')
    }
  })
})

describe('ProjectIndex on a project path', () => {
  const expanded = () =>
    screen
      .getAllByRole('button')
      .filter((button) => button.getAttribute('aria-expanded') === 'true')
      .map((button) => button.textContent)

  it('opens the row the address names', () => {
    pathname.value = '/projects/ipsum/'
    render(<ProjectIndex projects={projects} />)
    expect(expanded()).toEqual([expect.stringMatching(/^ipsum/)])
  })

  it('follows the address when it changes', () => {
    pathname.value = '/projects/ipsum/'
    const { rerender } = render(<ProjectIndex projects={projects} />)

    pathname.value = '/projects/'
    rerender(<ProjectIndex projects={projects} />)
    expect(expanded()).toEqual([])

    pathname.value = '/projects/lorem/'
    rerender(<ProjectIndex projects={projects} />)
    expect(expanded()).toEqual([expect.stringMatching(/^lorem/)])
  })

  it('replaces the address as rows open and close', async () => {
    pathname.value = '/projects/'
    const replaceState = vi.spyOn(window.history, 'replaceState')
    const pushState = vi.spyOn(window.history, 'pushState')
    const user = userEvent.setup()
    render(<ProjectIndex projects={projects} />)

    await user.click(row(/^lorem/))
    // At once, before the router has passed on the new path
    expect(row(/^lorem/)).toHaveAttribute('aria-expanded', 'true')
    expect(replaceState).toHaveBeenLastCalledWith(null, '', '/projects/lorem/')

    await user.click(row(/^lorem/))
    expect(replaceState).toHaveBeenLastCalledWith(null, '', '/projects/')
    expect(pushState).not.toHaveBeenCalled()
  })

  it('names the open project in the title', async () => {
    pathname.value = '/projects/'
    document.title = 'Projects'
    const user = userEvent.setup()
    const { rerender } = render(<ProjectIndex projects={projects} />)

    await user.click(row(/^lorem/))
    expect(document.title).toBe('Van Esterik · lorem')
    await user.click(row(/^lorem/))
    expect(document.title).toBe('Projects')

    // Back to an entry whose address names another project than its page
    pathname.value = '/projects/ipsum/'
    rerender(<ProjectIndex projects={projects} />)
    expect(document.title).toBe('Van Esterik · ipsum')
  })

  it('leaves the title alone off the projects route', async () => {
    pathname.value = '/'
    document.title = 'Storybook'
    const user = userEvent.setup()
    render(<ProjectIndex projects={projects} />)

    await user.click(row(/^lorem/))
    expect(document.title).toBe('Storybook')
  })

  it('leaves the address alone off the projects route', async () => {
    pathname.value = '/'
    const replaceState = vi.spyOn(window.history, 'replaceState')
    const user = userEvent.setup()
    render(<ProjectIndex projects={projects} />)

    await user.click(row(/^lorem/))
    expect(row(/^lorem/)).toHaveAttribute('aria-expanded', 'true')
    expect(replaceState).not.toHaveBeenCalled()
  })

  it('scrolls a deep-linked row into view', () => {
    pathname.value = '/projects/ipsum/'
    render(<ProjectIndex projects={projects} />)
    expect(scrollIntoView).toHaveBeenCalledOnce()
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: 'start',
      behavior: 'smooth',
    })
  })

  it("doesn't animate the scroll with reduced motion", () => {
    pathname.value = '/projects/ipsum/'
    reducedMotion = true
    render(<ProjectIndex projects={projects} />)
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: 'start',
      behavior: 'auto',
    })
  })

  it('scrolls nowhere without a project in the path', () => {
    pathname.value = '/projects/'
    render(<ProjectIndex projects={projects} />)
    expect(scrollIntoView).not.toHaveBeenCalled()
  })
})

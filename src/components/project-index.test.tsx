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

beforeEach(() => {
  pathname.value = null
  scrollIntoView.mockClear()
  Element.prototype.scrollIntoView = scrollIntoView
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
    type: 'mcp',
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

  it('sets the open row apart from the others', async () => {
    const user = userEvent.setup()
    render(<ProjectIndex projects={projects} />)

    await user.click(row(/^lorem/))

    const item = row(/^lorem/).closest('[data-slot="accordion-item"]')
    expect(item).toHaveAttribute('data-state', 'open')
    expect(item).toHaveClass('data-[state=open]:my-16')
  })

  it('lets the open row break out of the column on wide screens', async () => {
    const user = userEvent.setup()
    render(<ProjectIndex projects={projects} />)

    await user.click(row(/^lorem/))

    expect(row(/^lorem/).closest('[data-slot="accordion-item"]')).toHaveClass(
      'lg:data-[state=open]:-mx-20',
    )
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

  it('plays a recorded flow, with its note under it', async () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    const { container } = render(
      <ProjectIndex
        projects={[
          project({
            slug: 'amet',
            name: 'amet',
            preview: {
              image: '/projects/amet.jpg',
              video: '/projects/amet.mp4',
              note: 'Recorded in 2026.',
            },
          }),
        ]}
      />,
    )

    await user.click(row(/^amet/))

    expect(container.querySelector('video')).toHaveAttribute(
      'aria-label',
      'Recording of amet',
    )
    expect(screen.getByText('Recorded in 2026.')).toHaveClass(
      'text-muted-foreground',
    )
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

  it('snaps a deep-linked row to the top', () => {
    pathname.value = '/projects/ipsum/'
    render(<ProjectIndex projects={projects} />)
    expect(scrollIntoView).toHaveBeenCalledOnce()
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: 'start',
      behavior: 'instant',
    })
    expect(scrollIntoView.mock.contexts[0]).toHaveAttribute(
      'data-slug',
      'ipsum',
    )
  })

  it('snaps a row high enough to hide the row above it under the header', () => {
    pathname.value = '/projects/ipsum/'
    render(<ProjectIndex projects={projects} />)
    // The scroll padding (md:scroll-pt-24) less the open row's margin (my-16)
    expect(scrollIntoView.mock.contexts[0]).toHaveClass('md:-scroll-mt-8')
  })

  it('snaps a row that opens to the top', async () => {
    pathname.value = '/projects/'
    const user = userEvent.setup()
    render(<ProjectIndex projects={projects} />)

    await user.click(row(/^ipsum/))
    expect(scrollIntoView).toHaveBeenCalledOnce()
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: 'start',
      behavior: 'instant',
    })
    expect(scrollIntoView.mock.contexts[0]).toHaveAttribute(
      'data-slug',
      'ipsum',
    )
  })

  it('stays put when the open row closes', async () => {
    pathname.value = '/projects/ipsum/'
    const user = userEvent.setup()
    render(<ProjectIndex projects={projects} />)
    scrollIntoView.mockClear()

    await user.click(row(/^ipsum/))
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('scrolls nowhere without a project in the path', () => {
    pathname.value = '/projects/'
    render(<ProjectIndex projects={projects} />)
    expect(scrollIntoView).not.toHaveBeenCalled()
  })
})

describe('ProjectIndex, browsed with J and K', () => {
  const openSlug = () =>
    document
      .querySelector('[data-slot="accordion-item"][data-state="open"]')
      ?.getAttribute('data-slug')

  it('activates the next project with J and the previous with K, as a click does', async () => {
    pathname.value = '/projects/ipsum/'
    const replaceState = vi.spyOn(window.history, 'replaceState')
    const user = userEvent.setup()
    render(<ProjectIndex projects={projects} />)

    await user.keyboard('j')
    expect(openSlug()).toBe('dolor')
    expect(row(/^dolor/)).toHaveAttribute('aria-expanded', 'true')
    expect(replaceState).toHaveBeenLastCalledWith(null, '', '/projects/dolor/')

    await user.keyboard('kk')
    expect(openSlug()).toBe('lorem')
    expect(row(/^lorem/)).toHaveAttribute('aria-expanded', 'true')
  })

  it('takes capitals too, for Caps Lock and Shift', async () => {
    pathname.value = '/projects/ipsum/'
    const user = userEvent.setup()
    render(<ProjectIndex projects={projects} />)

    await user.keyboard('J')
    expect(openSlug()).toBe('dolor')
  })

  it('starts at the first project with J, and the last with K', async () => {
    pathname.value = '/projects/'
    const user = userEvent.setup()
    const { unmount } = render(<ProjectIndex projects={projects} />)

    await user.keyboard('j')
    expect(openSlug()).toBe('lorem')
    unmount()

    render(<ProjectIndex projects={projects} />)
    await user.keyboard('k')
    expect(openSlug()).toBe('sit')
  })

  it('stays on the last project with J, and the first with K', async () => {
    pathname.value = '/projects/sit/'
    const user = userEvent.setup()
    const { unmount } = render(<ProjectIndex projects={projects} />)

    await user.keyboard('j')
    expect(openSlug()).toBe('sit')
    unmount()

    pathname.value = '/projects/lorem/'
    render(<ProjectIndex projects={projects} />)
    await user.keyboard('k')
    expect(openSlug()).toBe('lorem')
  })

  it('leaves Cmd+J and other shortcuts to the browser', async () => {
    pathname.value = '/projects/ipsum/'
    const user = userEvent.setup()
    render(<ProjectIndex projects={projects} />)

    await user.keyboard('{Meta>}j{/Meta}{Control>}j{/Control}{Alt>}j{/Alt}')
    expect(openSlug()).toBe('ipsum')
  })

  it('leaves the keys to a text field', async () => {
    pathname.value = '/projects/ipsum/'
    const user = userEvent.setup()
    render(
      <>
        <input aria-label="search" />
        <ProjectIndex projects={projects} />
      </>,
    )

    await user.click(screen.getByLabelText('search'))
    await user.keyboard('j')
    expect(openSlug()).toBe('ipsum')
  })
})

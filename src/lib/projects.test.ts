import { describe, expect, it } from 'vitest'

import { getProjects, projectTitle } from './projects'

const project = (overrides: Record<string, unknown> = {}) => ({
  slug: 'lorem',
  type: 'web',
  name: 'lorem',
  stack: ['next.js'],
  year: 2026,
  status: 'live',
  role: 'author',
  description: 'Lorem ipsum.',
  preview: {},
  links: {},
  ...overrides,
})

describe('getProjects', () => {
  it('reads the projects in content/projects.json', () => {
    expect(getProjects().length).toBeGreaterThan(0)
  })

  it('orders newest first, keeping the file order within a year', () => {
    const projects = getProjects([
      project({ slug: 'a', year: 2021 }),
      project({ slug: 'b', year: 2026 }),
      project({ slug: 'c', year: 2021 }),
    ])
    expect(projects.map(({ slug }) => slug)).toEqual(['b', 'a', 'c'])
  })

  it('keeps the terminal lines and links', () => {
    const [result] = getProjects([
      project({
        type: 'cli',
        preview: { terminal: [{ text: 'ls', tone: 'command' }] },
        links: { source: 'https://example.com' },
      }),
    ])
    expect(result.preview.terminal).toEqual([{ text: 'ls', tone: 'command' }])
    expect(result.links).toEqual({ source: 'https://example.com' })
  })

  it.each([
    [
      'a missing field',
      { year: undefined },
      'lorem: "year" must be a whole number',
    ],
    [
      'an unknown type',
      { type: 'app' },
      'lorem: "type" must be one of web, cli, lib',
    ],
    [
      'an unknown status',
      { status: 'Live' },
      'lorem: "status" must be one of live, wip, archived',
    ],
    [
      'an unknown tone',
      { type: 'cli', preview: { terminal: [{ text: 'ls', tone: 'warning' }] } },
      'lorem: "tone" must be one of command, info, warn, success',
    ],
  ])('fails, naming the project, on %s', (_, overrides, message) => {
    expect(() => getProjects([project(overrides)])).toThrow(message)
  })

  it.each([
    ['the project', { link: {} }, 'lorem: unknown field "link"'],
    [
      'the preview',
      { preview: { img: '/a.svg' } },
      'lorem: unknown field "preview.img"',
    ],
    [
      'the links',
      { links: { 'write-up': 'https://example.com' } },
      'lorem: unknown field "links.write-up"',
    ],
  ])('fails on an unknown field in %s', (_, overrides, message) => {
    expect(() => getProjects([project(overrides)])).toThrow(message)
  })

  it('fails on null where an object belongs', () => {
    expect(() => getProjects([project({ preview: null })])).toThrow(
      'lorem: "preview" must be an object',
    )
  })

  it('fails on a terminal session without lines', () => {
    expect(() =>
      getProjects([project({ type: 'cli', preview: { terminal: [] } })]),
    ).toThrow('lorem: "terminal" must have at least one line')
  })

  it('fails on a terminal session for a web project', () => {
    expect(() =>
      getProjects([
        project({ preview: { terminal: [{ text: 'ls', tone: 'command' }] } }),
      ]),
    ).toThrow('lorem: a web project shows an image, not a terminal session')
  })

  it('accepts mcp projects, a terminal session for a cli one, and a screenshot for any type', () => {
    const projects = getProjects([
      project({
        type: 'cli',
        preview: { terminal: [{ text: 'cd', tone: 'command' }] },
      }),
      project({ slug: 'ipsum', type: 'mcp', preview: { image: '/a.jpg' } }),
      project({
        slug: 'dolor',
        type: 'cli',
        preview: { image: '/b.png', frame: 'terminal' },
      }),
    ])
    expect(projects.map(({ type }) => type)).toEqual(['cli', 'mcp', 'cli'])
    expect(projects[2].preview.frame).toBe('terminal')
  })

  it('fails on an unknown frame', () => {
    expect(() =>
      getProjects([project({ preview: { image: '/a.jpg', frame: 'phone' } })]),
    ).toThrow('lorem: "frame" must be one of browser, terminal')
  })

  it('fails on a frame without a screenshot', () => {
    expect(() =>
      getProjects([
        project({
          type: 'cli',
          preview: {
            terminal: [{ text: 'ls', tone: 'command' }],
            frame: 'terminal',
          },
        }),
      ]),
    ).toThrow('lorem: "frame" needs a screenshot')
  })

  it('fails on both a screenshot and a terminal session', () => {
    expect(() =>
      getProjects([
        project({
          type: 'cli',
          preview: {
            image: '/a.png',
            terminal: [{ text: 'ls', tone: 'command' }],
          },
        }),
      ]),
    ).toThrow(
      'lorem: a preview is a screenshot or a terminal session, not both',
    )
  })

  it('keeps a video with its screenshot, and a note', () => {
    const [result] = getProjects([
      project({
        preview: {
          image: '/a.jpg',
          video: '/a.mp4',
          note: 'Recorded in 2026.',
        },
      }),
    ])
    expect(result.preview).toMatchObject({
      image: '/a.jpg',
      video: '/a.mp4',
      note: 'Recorded in 2026.',
    })
  })

  it('fails on a video without a screenshot for its poster', () => {
    expect(() =>
      getProjects([project({ preview: { video: '/a.mp4' } })]),
    ).toThrow('lorem: a video needs a screenshot, its poster')
  })

  it('fails on a video in the terminal frame', () => {
    expect(() =>
      getProjects([
        project({
          type: 'cli',
          preview: { image: '/a.png', frame: 'terminal', video: '/a.mp4' },
        }),
      ]),
    ).toThrow('lorem: a video plays in the browser frame')
  })

  it('keeps a recording', () => {
    const [result] = getProjects([
      project({ type: 'cli', preview: { recording: '/a.cast' } }),
    ])
    expect(result.preview.recording).toBe('/a.cast')
  })

  it('fails on a recording and a terminal session', () => {
    expect(() =>
      getProjects([
        project({
          type: 'cli',
          preview: {
            recording: '/a.cast',
            terminal: [{ text: 'ls', tone: 'command' }],
          },
        }),
      ]),
    ).toThrow('lorem: a preview is a recording or a terminal session, not both')
  })

  it('fails on a recording for a web project', () => {
    expect(() =>
      getProjects([project({ preview: { recording: '/a.cast' } })]),
    ).toThrow('lorem: a web project shows an image, not a recording')
  })

  it('names a project by its position when its slug is missing', () => {
    expect(() =>
      getProjects([project(), project({ slug: undefined })]),
    ).toThrow('project 2: "slug" must be a non-empty string')
  })

  it('fails on a duplicate slug', () => {
    expect(() => getProjects([project(), project()])).toThrow(
      'lorem: the slug is used twice',
    )
  })
})

describe('projectTitle', () => {
  it('names the site and the project', () => {
    expect(projectTitle('CrossVision')).toBe('Van Esterik · CrossVision')
  })
})

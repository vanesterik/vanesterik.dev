import projects from '@/content/projects.json'

export const PROJECT_TYPES = ['web', 'cli', 'lib', 'mcp'] as const
export const STATUSES = ['live', 'wip', 'archived'] as const
export const TONES = ['command', 'info', 'warn', 'success'] as const
export const FRAMES = ['browser', 'terminal'] as const

export type ProjectType = (typeof PROJECT_TYPES)[number]
export type Status = (typeof STATUSES)[number]
export type Tone = (typeof TONES)[number]
export type Frame = (typeof FRAMES)[number]

export type TerminalLine = {
  text: string
  tone: Tone
}

export type Project = {
  slug: string
  type: ProjectType
  name: string
  stack: string[]
  year: number
  status: Status
  role: string
  description: string
  url?: string
  preview: {
    image?: string
    // The frame a screenshot shows in; the browser frame by default
    frame?: Frame
    terminal?: TerminalLine[]
    video?: string
    recording?: string
    // A line in muted grey under the preview
    note?: string
  }
  links: {
    primary?: string
    source?: string
    writeup?: string
  }
}

type Raw = Record<string, unknown>

// Every field a project, its preview and its links may have, so a typo (such
// as "write-up" for "writeup") fails the build instead of dropping a link
const PROJECT_FIELDS = [
  'slug',
  'type',
  'name',
  'stack',
  'year',
  'status',
  'role',
  'description',
  'url',
  'preview',
  'links',
]
const PREVIEW_FIELDS = [
  'image',
  'frame',
  'terminal',
  'video',
  'recording',
  'note',
]
const LINK_FIELDS = ['primary', 'source', 'writeup']

const isRecord = (value: unknown): value is Raw =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const fail = (where: string, message: string): never => {
  throw new Error(`content/projects.json: ${where}: ${message}`)
}

const readString = (raw: Raw, field: string, where: string) => {
  const value = raw[field]
  if (typeof value !== 'string' || !value) {
    return fail(where, `"${field}" must be a non-empty string`)
  }
  return value
}

const readOptionalString = (raw: Raw, field: string, where: string) =>
  raw[field] === undefined ? undefined : readString(raw, field, where)

const readOneOf = <T extends string>(
  raw: Raw,
  field: string,
  values: readonly T[],
  where: string,
) => {
  const value = raw[field]
  if (!values.includes(value as T)) {
    return fail(where, `"${field}" must be one of ${values.join(', ')}`)
  }
  return value as T
}

const checkFields = (
  raw: Raw,
  allowed: string[],
  where: string,
  prefix = '',
) => {
  for (const key of Object.keys(raw)) {
    if (!allowed.includes(key)) fail(where, `unknown field "${prefix}${key}"`)
  }
}

const readRecord = (
  raw: Raw,
  field: string,
  allowed: string[],
  where: string,
) => {
  const value = raw[field] === undefined ? {} : raw[field]
  if (!isRecord(value)) return fail(where, `"${field}" must be an object`)
  checkFields(value, allowed, where, `${field}.`)
  return value
}

const readTerminal = (preview: Raw, where: string) => {
  const lines = preview.terminal
  if (lines === undefined) return undefined
  if (!Array.isArray(lines)) return fail(where, '"terminal" must be a list')
  if (!lines.length) {
    return fail(where, '"terminal" must have at least one line')
  }

  return lines.map((line) => {
    if (!isRecord(line)) return fail(where, 'a terminal line must be an object')
    return {
      text: readString(line, 'text', where),
      tone: readOneOf(line, 'tone', TONES, where),
    }
  })
}

const readProject = (raw: unknown, index: number): Project => {
  const position = `project ${index + 1}`
  if (!isRecord(raw)) return fail(position, 'must be an object')

  // Name the project by its slug where it has one
  const where = typeof raw.slug === 'string' && raw.slug ? raw.slug : position
  checkFields(raw, PROJECT_FIELDS, where)
  const { stack, year } = raw

  if (
    !Array.isArray(stack) ||
    !stack.length ||
    !stack.every((item) => typeof item === 'string' && item)
  ) {
    fail(where, '"stack" must be a list of non-empty strings')
  }
  if (typeof year !== 'number' || !Number.isInteger(year)) {
    fail(where, '"year" must be a whole number')
  }

  const preview = readRecord(raw, 'preview', PREVIEW_FIELDS, where)
  const links = readRecord(raw, 'links', LINK_FIELDS, where)
  const type = readOneOf(raw, 'type', PROJECT_TYPES, where)

  // A preview is a screenshot, in the browser or the terminal frame, or a
  // terminal session; websites don't have sessions
  if (preview.image !== undefined && preview.terminal !== undefined) {
    fail(where, 'a preview is a screenshot or a terminal session, not both')
  }
  if (preview.frame !== undefined && preview.image === undefined) {
    fail(where, '"frame" needs a screenshot')
  }
  if (type === 'web' && preview.terminal !== undefined) {
    fail(where, 'a web project shows an image, not a terminal session')
  }
  // A video plays in the browser frame, over its first frame as a screenshot
  if (preview.video !== undefined && preview.image === undefined) {
    fail(where, 'a video needs a screenshot, its poster')
  }
  if (preview.video !== undefined && preview.frame === 'terminal') {
    fail(where, 'a video plays in the browser frame')
  }

  return {
    slug: readString(raw, 'slug', where),
    type,
    name: readString(raw, 'name', where),
    stack: stack as string[],
    year: year as number,
    status: readOneOf(raw, 'status', STATUSES, where),
    role: readString(raw, 'role', where),
    description: readString(raw, 'description', where),
    url: readOptionalString(raw, 'url', where),
    preview: {
      image: readOptionalString(preview, 'image', where),
      frame:
        preview.frame === undefined
          ? undefined
          : readOneOf(preview, 'frame', FRAMES, where),
      terminal: readTerminal(preview, where),
      video: readOptionalString(preview, 'video', where),
      recording: readOptionalString(preview, 'recording', where),
      note: readOptionalString(preview, 'note', where),
    },
    links: {
      primary: readOptionalString(links, 'primary', where),
      source: readOptionalString(links, 'source', where),
      writeup: readOptionalString(links, 'writeup', where),
    },
  }
}

/**
 * Get the projects in content/projects.json, checked and newest first: by
 * year, keeping the file's order within a year. A project with a missing,
 * unknown or misplaced value, or an unknown field, fails the build, named by
 * its slug.
 */
export const getProjects = (items: unknown = projects): Project[] => {
  if (!Array.isArray(items)) {
    return fail('the file', 'must hold a list of projects')
  }

  const result = items.map(readProject)
  const slugs = new Set<string>()
  for (const { slug } of result) {
    if (slugs.has(slug)) fail(slug, 'the slug is used twice')
    slugs.add(slug)
  }

  // Array sort is stable, so projects of one year keep the file's order
  return [...result].sort((a, b) => b.year - a.year)
}

/**
 * A project's page title, on /projects/<slug>/ and when its row is opened
 */
export const projectTitle = (name: string) => `Van Esterik · ${name}`

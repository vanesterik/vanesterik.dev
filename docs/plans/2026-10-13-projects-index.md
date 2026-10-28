# Projects index: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, in this session, on the branch `feat/projects-index`. Subagents may review; they never implement (see `~/.claude/CLAUDE.md`). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the projects page's "coming soon" with an `ls -l` style index of projects whose rows expand to a preview and details, and mark the current page in the navigation. This is story #73.

**Architecture:** Six tasks, one commit each:

1. Three color tokens: `info`, `warning`, `success`.
2. `NavLink`, marking the current page in `Navigation` and `MobileMenu`.
3. The content model: `content/projects.json`, validated by `getProjects()` in `src/lib/projects.ts`, and the screenshot placeholder.
4. `ProjectStatus`, `BrowserFrame` and `TerminalFrame`.
5. `ProjectDetails`.
6. `ui/accordion.tsx`, `ProjectIndex`, the page, the docs and the browser check.

**Tech stack:** Next.js 16 App Router (static export), React 19, Tailwind 4 (container queries are built in), `radix-ui` 1.7 (`Accordion`), Vitest with Testing Library and user-event, Storybook 10 (`@storybook/nextjs-vite`). No new dependencies.

**Spec:** `docs/specs/2026-10-13-projects-index-design.md` (this pull request's first commit). Koen approved it on 2026-10-13.

**Checked beforehand:**
- **Accordion:** the shadcn registry's `radix-nova` Accordion imports `@/app/(create)/components/icon-placeholder`, which exists only on the shadcn website, and uses animation and ring classes this site doesn't define. Task 6 writes `src/components/ui/accordion.tsx` by hand with the same structure, as `components.json` was. This departs from the spec's "added with `npx shadcn@latest add accordion`".
- **`cn`:** it merges conflicting Tailwind classes (`cn('bg-secondary/80 hover:bg-accent', 'bg-primary')` gives `hover:bg-accent bg-primary`), so the current item in `MobileMenu` can override the dropdown item's background.
- **Biome:** a plain `<img>` passes `npm run lint`.
- **Storybook:** a story fakes the URL for `usePathname` with `parameters: { nextjs: { appDirectory: true, navigation: { pathname } } }`.

## Global constraints

- **Static export:** no route handlers, server actions or image optimizer; the screenshot is a plain `<img>`.
- **Colors are tokens only.** The new tokens are `info`, `warning` and `success`, defined in `:root` and `.dark` like the others.
- **Client components:** only `nav-link`, `mobile-menu`, `project-index` and `ui/accordion` are added to the list; everything else stays server-safe, with no Node imports, so Storybook can render it.
- **Copy:** lowercase UI labels: `type`, `name`, `stack`, `year`, `status`, `role`, `visit site`, `install`, `npm`, `source`, `write-up`. American spelling ("color").
- **Before each commit:** run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`; for tasks that add stories, also `npm run build-storybook`.
- **CI:** it runs on every push to the pull request; wait for it before the next task.
- **Commit messages:** conventional, with a lowercase subject, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review focus

1. **A row's accessible name:** a screen reader announces a row by its button's text. Hidden cells (`stack` and `year` on narrow tables) and the `aria-hidden` dot and marker must not be read, and the name must still say type, name and status. Task 6 tests the name.
2. **Content mistakes:** a typo in `content/projects.json` (a status of `"Live"`, a missing `year`, a tone of `"warning"`) must fail the build with the project's slug, not render a broken row. Task 3 tests each case.
3. **The current page on the home page and under trailing slashes:** `/` must be current only on the home page, and `/projects/` must match `/projects`. Task 2 tests both.
4. **The light theme's terminal:** the terminal frame must stay dark, with readable info, warning and success lines, when the page is light. Task 4 tests the `dark` class, and Task 6 checks it in the browser.
5. **A project with no preview or no links:** a project without a screenshot or terminal session, or without any links, must render its details without empty frames or an empty link list. Tasks 5 and 6 test both.

---

### Task 1: Color tokens

**Files:**
- Modify: `src/stories/tokens.ts`
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: the Tailwind classes `text-info`, `text-warning`, `text-success`, `outline-info` (and every other utility of those colors).

- [ ] **Step 1: List the tokens first**

In `src/stories/tokens.ts`, add to `COLOR_TOKENS`, after `'muted-foreground'`:

```ts
  'info',
  'warning',
  'success',
```

- [ ] **Step 2: Watch the sync test fail**

Run: `npx vitest run src/stories/tokens.test.ts`
Expected: FAIL, listing `info`, `warning` and `success` as not defined in `globals.css`.

- [ ] **Step 3: Define the tokens**

In `src/app/globals.css`:
- in `@theme inline`, after `--color-muted-foreground: var(--muted-foreground);`:

  ```css
  --color-info: var(--info);
  --color-warning: var(--warning);
  --color-success: var(--success);
  ```

- in `:root`, after `--muted-foreground`:

  ```css
  /* From Shiki's github-light theme, which code blocks use */
  --info: #005cc5;
  --warning: #e36209;
  --success: #22863a;
  ```

- in `.dark`, after `--muted-foreground`:

  ```css
  /* From Shiki's github-dark theme, which code blocks use */
  --info: #79b8ff;
  --warning: #ffab70;
  --success: #85e89d;
  ```

- [ ] **Step 4: Run the sync test**

Run: `npx vitest run src/stories/tokens.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the checks and commit**

```bash
npm run lint && npm run typecheck && npm test && npm run build
git add src/stories/tokens.ts src/app/globals.css
git commit -m "feat: add info, warning and success color tokens" -m "Refs #73" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task 2: Marking the current page

**Files:**
- Create: `src/components/nav-link.tsx`, `src/components/nav-link.test.tsx`
- Modify: `src/components/navigation.tsx`, `src/components/navigation.stories.tsx`
- Modify: `src/components/mobile-menu.tsx`, `src/components/mobile-menu.test.tsx`

**Interfaces:**
- Produces: `NavLink({ name: string, url: string })`; `isCurrentPath(pathname: string | null, url: string): boolean`.

- [ ] **Step 1: Write the failing tests**

`src/components/nav-link.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { isCurrentPath, NavLink } from './nav-link'

const pathname = vi.hoisted(() => ({ value: '/' }))

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.value,
}))

beforeEach(() => {
  pathname.value = '/'
})

describe('isCurrentPath', () => {
  it('ignores a trailing slash on either side', () => {
    expect(isCurrentPath('/projects/', '/projects')).toBe(true)
    expect(isCurrentPath('/projects', '/projects/')).toBe(true)
  })

  it('matches home only on the home page', () => {
    expect(isCurrentPath('/', '/')).toBe(true)
    expect(isCurrentPath('/projects/', '/')).toBe(false)
  })

  it('matches nothing without a path', () => {
    expect(isCurrentPath(null, '/')).toBe(false)
  })
})

describe('NavLink', () => {
  it('marks the current page', () => {
    pathname.value = '/projects/'
    render(<NavLink name="projects" url="/projects" />)

    const link = screen.getByRole('link', { name: 'projects' })
    expect(link).toHaveAttribute('aria-current', 'page')
    expect(link).toHaveAttribute('data-variant', 'default')
  })

  it('leaves other pages unmarked, in their usual style', () => {
    pathname.value = '/projects/'
    render(
      <>
        <NavLink name="van_esterik" url="/" />
        <NavLink name="about" url="/about" />
      </>,
    )

    const home = screen.getByRole('link', { name: 'van_esterik' })
    expect(home).not.toHaveAttribute('aria-current')
    expect(home).toHaveAttribute('data-variant', 'ghost')
    expect(screen.getByRole('link', { name: 'about' })).toHaveAttribute(
      'data-variant',
      'secondary',
    )
  })
})
```

In `src/components/mobile-menu.test.tsx`, add the same `pathname` mock and `beforeEach` above `describe`, and add this test:

```tsx
it('marks the current page in the menu', async () => {
  pathname.value = '/about/'
  const user = userEvent.setup()
  render(<MobileMenu items={items} />)

  await user.click(screen.getByRole('button', { name: 'menu' }))

  expect(screen.getByRole('menuitem', { name: 'about' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  expect(screen.getByRole('menuitem', { name: 'posts' })).not.toHaveAttribute(
    'aria-current',
  )
})
```

(with `import { beforeEach, describe, expect, it, vi } from 'vitest'`).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/components/nav-link.test.tsx src/components/mobile-menu.test.tsx`
Expected: FAIL: `./nav-link` doesn't exist, and the menu item has no `aria-current`.

- [ ] **Step 3: Write `NavLink`**

`src/components/nav-link.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Button } from '@/components/ui/button'

// The static export adds a trailing slash to every path but the root
const withoutTrailingSlash = (path: string) => path.replace(/(.)\/$/, '$1')

/**
 * Whether the passed URL is the page being shown
 */
export const isCurrentPath = (pathname: string | null, url: string) =>
  pathname !== null &&
  withoutTrailingSlash(pathname) === withoutTrailingSlash(url)

type NavLinkProps = {
  name: string
  url: string
}

/**
 * A navigation button that shows, in the primary style, when its page is the
 * one being shown
 */
export const NavLink = ({ name, url }: NavLinkProps) => {
  const isCurrent = isCurrentPath(usePathname(), url)
  const variant = isCurrent ? 'default' : url === '/' ? 'ghost' : 'secondary'

  return (
    <Button asChild variant={variant}>
      <Link href={url} aria-current={isCurrent ? 'page' : undefined}>
        {name}
      </Link>
    </Button>
  )
}
```

- [ ] **Step 4: Use it in `Navigation` and `MobileMenu`**

In `src/components/navigation.tsx`, replace

```tsx
;<Button asChild variant={url === '/' ? 'ghost' : 'secondary'}>
  <Link href={url}>{name}</Link>
</Button>
```

with

```tsx
;<NavLink name={name} url={url} />
```

and replace the `Link` and `Button` imports with `import { NavLink } from '@/components/nav-link'`.

In `src/components/mobile-menu.tsx`:
- add `'use client'` as the first line and `import { usePathname } from 'next/navigation'`, and `import { isCurrentPath } from '@/components/nav-link'`;
- in the component, add `const pathname = usePathname()` before the `return`;
- replace each item with:

  ```tsx
          <DropdownMenuItem
            key={name}
            asChild
            className={
              isCurrentPath(pathname, url)
                ? 'bg-primary text-primary-foreground'
                : undefined
            }
          >
            <Link
              href={url}
              aria-current={isCurrentPath(pathname, url) ? 'page' : undefined}
            >
              {name}
            </Link>
          </DropdownMenuItem>
  ```

- update its doc comment: "The layout hides it from md up, where Navigation shows them instead. It marks the current page like NavLink."

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/components/nav-link.test.tsx src/components/mobile-menu.test.tsx src/components/navigation.test.tsx`
Expected: PASS. `navigation.test.tsx` passes unchanged: without a router `usePathname()` returns `null`, so nothing is current.

- [ ] **Step 6: Show it in Storybook**

In `src/components/navigation.stories.tsx`, add `parameters: { nextjs: { appDirectory: true } }` to `meta`, and this story:

```tsx
// The current page shows in the primary style
export const OnProjects: Story = {
  parameters: {
    nextjs: { navigation: { pathname: '/projects/' } },
  },
}
```

- [ ] **Step 7: Run the checks and commit**

```bash
npm run lint && npm run typecheck && npm test && npm run build && npm run build-storybook
git add src/components/nav-link.tsx src/components/nav-link.test.tsx src/components/navigation.tsx src/components/navigation.stories.tsx src/components/mobile-menu.tsx src/components/mobile-menu.test.tsx
git commit -m "feat: mark the current page in the navigation" -m "Refs #73" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task 3: The projects content

**Files:**
- Create: `src/lib/projects.ts`, `src/lib/projects.test.ts`
- Create: `content/projects.json`
- Create: `public/projects/placeholder.svg`

**Interfaces:**
- Produces, from `src/lib/projects.ts`:

  ```ts
  type ProjectType = 'web' | 'cli' | 'lib'
  type Status = 'live' | 'wip' | 'archived'
  type Tone = 'command' | 'info' | 'warn' | 'success'
  type TerminalLine = { text: string; tone: Tone }
  type Project = {
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
      terminal?: TerminalLine[]
      video?: string
      recording?: string
    }
    links: { primary?: string; source?: string; writeup?: string }
  }
  getProjects(items?: unknown): Project[] // newest first; throws on bad content
  ```

- [ ] **Step 1: Write the failing test**

`src/lib/projects.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { getProjects } from './projects'

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
      { preview: { terminal: [{ text: 'ls', tone: 'warning' }] } },
      'lorem: "tone" must be one of command, info, warn, success',
    ],
  ])('fails, naming the project, on %s', (_, overrides, message) => {
    expect(() => getProjects([project(overrides)])).toThrow(message)
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/projects.test.ts`
Expected: FAIL, because `./projects` doesn't exist.

- [ ] **Step 3: Write the content and the placeholder**

`content/projects.json`, six lorem ipsum projects:

```json
[
  {
    "slug": "lorem",
    "type": "web",
    "name": "lorem",
    "stack": ["next.js", "mdx"],
    "year": 2026,
    "status": "live",
    "role": "design + build",
    "description": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.",
    "url": "https://lorem.example.com",
    "preview": { "image": "/projects/placeholder.svg" },
    "links": {
      "primary": "https://lorem.example.com",
      "source": "https://example.com/lorem",
      "writeup": "https://example.com/lorem/write-up"
    }
  },
  {
    "slug": "ipsum",
    "type": "cli",
    "name": "ipsum",
    "stack": ["bash", "tar"],
    "year": 2026,
    "status": "wip",
    "role": "author",
    "description": "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo.",
    "preview": {
      "terminal": [
        { "text": "ipsum pack ./lorem", "tone": "command" },
        { "text": "scanning 12,480 files …", "tone": "info" },
        { "text": "skipped 316 dolor entries", "tone": "warn" },
        { "text": "wrote lorem.tar.zst", "tone": "success" }
      ]
    },
    "links": {
      "primary": "https://example.com/ipsum/install",
      "source": "https://example.com/ipsum"
    }
  },
  {
    "slug": "dolor",
    "type": "lib",
    "name": "dolor",
    "stack": ["typescript"],
    "year": 2025,
    "status": "live",
    "role": "maintainer",
    "description": "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
    "preview": {
      "terminal": [
        { "text": "npm install dolor", "tone": "command" },
        { "text": "resolving 3 packages …", "tone": "info" },
        { "text": "1 deprecated sit amet", "tone": "warn" },
        { "text": "added dolor@2.1.0", "tone": "success" }
      ]
    },
    "links": {
      "primary": "https://example.com/dolor/npm",
      "source": "https://example.com/dolor",
      "writeup": "https://example.com/dolor/write-up"
    }
  },
  {
    "slug": "sit-amet",
    "type": "web",
    "name": "sit amet",
    "stack": ["react", "redux", "sitecore"],
    "year": 2023,
    "status": "archived",
    "role": "front-end lead",
    "description": "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim.",
    "url": "https://sit-amet.example.com",
    "preview": { "image": "/projects/placeholder.svg" },
    "links": { "primary": "https://sit-amet.example.com" }
  },
  {
    "slug": "consectetur",
    "type": "cli",
    "name": "consectetur",
    "stack": ["python"],
    "year": 2021,
    "status": "archived",
    "role": "author",
    "description": "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.",
    "preview": {
      "terminal": [
        { "text": "consectetur --check ./data", "tone": "command" },
        { "text": "reading 48 lorem files …", "tone": "info" },
        { "text": "2 files without ipsum", "tone": "warn" },
        { "text": "46 files ok", "tone": "success" }
      ]
    },
    "links": { "source": "https://example.com/consectetur" }
  },
  {
    "slug": "adipiscing",
    "type": "lib",
    "name": "adipiscing",
    "stack": ["javascript", "canvas"],
    "year": 2019,
    "status": "wip",
    "role": "author",
    "description": "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.",
    "preview": {},
    "links": {}
  }
]
```

`public/projects/placeholder.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000">
  <rect width="1600" height="1000" fill="#e7e5e4"/>
  <text x="800" y="500" fill="#78716c" font-family="ui-monospace, monospace" font-size="48" text-anchor="middle" dominant-baseline="middle">screenshot</text>
</svg>
```

(`#e7e5e4` and `#78716c` are stone-200 and stone-500; an image can't use the CSS tokens.)

- [ ] **Step 4: Write `getProjects`**

`src/lib/projects.ts`:

```ts
import projects from '@/content/projects.json'

export const PROJECT_TYPES = ['web', 'cli', 'lib'] as const
export const STATUSES = ['live', 'wip', 'archived'] as const
export const TONES = ['command', 'info', 'warn', 'success'] as const

export type ProjectType = (typeof PROJECT_TYPES)[number]
export type Status = (typeof STATUSES)[number]
export type Tone = (typeof TONES)[number]

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
    terminal?: TerminalLine[]
    video?: string
    recording?: string
  }
  links: {
    primary?: string
    source?: string
    writeup?: string
  }
}

type Raw = Record<string, unknown>

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

const readRecord = (raw: Raw, field: string, where: string) => {
  const value = raw[field] ?? {}
  if (!isRecord(value)) return fail(where, `"${field}" must be an object`)
  return value
}

const readTerminal = (preview: Raw, where: string) => {
  const lines = preview.terminal
  if (lines === undefined) return undefined
  if (!Array.isArray(lines)) return fail(where, '"terminal" must be a list')

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

  const preview = readRecord(raw, 'preview', where)
  const links = readRecord(raw, 'links', where)

  return {
    slug: readString(raw, 'slug', where),
    type: readOneOf(raw, 'type', PROJECT_TYPES, where),
    name: readString(raw, 'name', where),
    stack: stack as string[],
    year: year as number,
    status: readOneOf(raw, 'status', STATUSES, where),
    role: readString(raw, 'role', where),
    description: readString(raw, 'description', where),
    url: readOptionalString(raw, 'url', where),
    preview: {
      image: readOptionalString(preview, 'image', where),
      terminal: readTerminal(preview, where),
      video: readOptionalString(preview, 'video', where),
      recording: readOptionalString(preview, 'recording', where),
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
 * year, keeping the file's order within a year. A project with a missing or
 * unknown value fails the build, named by its slug.
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
```

The test's `toEqual` on `links` ignores `undefined` properties, so `{ source }` equals `{ primary: undefined, source, writeup: undefined }`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/projects.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 6: Run the checks and commit**

```bash
npm run lint && npm run typecheck && npm test && npm run build
git add src/lib/projects.ts src/lib/projects.test.ts content/projects.json public/projects/placeholder.svg
git commit -m "feat: add the projects content model with placeholder projects" -m "Refs #73" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task 4: Status and preview frames

**Files:**
- Create: `src/components/project-status.tsx` (+ `.test.tsx`, `.stories.tsx`)
- Create: `src/components/browser-frame.tsx` (+ `.test.tsx`, `.stories.tsx`)
- Create: `src/components/terminal-frame.tsx` (+ `.test.tsx`, `.stories.tsx`)

**Interfaces:**
- Consumes: `Status`, `TerminalLine` from Task 3; `text-info`, `text-warning`, `text-success` from Task 1.
- Produces: `ProjectStatus({ status: Status })`; `BrowserFrame({ url?: string, image: string, alt: string })`; `TerminalFrame({ name: string, lines: TerminalLine[] })`.

- [ ] **Step 1: Write the failing tests**

`src/components/project-status.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ProjectStatus } from './project-status'

describe('ProjectStatus', () => {
  it.each([
    ['live', 'text-info'],
    ['wip', 'text-warning'],
    ['archived', 'text-muted-foreground'],
  ] as const)('labels %s, with a dot in its color', (status, color) => {
    const { container } = render(<ProjectStatus status={status} />)
    expect(container).toHaveTextContent(status)
    expect(screen.getByText('●')).toHaveClass(color)
    expect(screen.getByText('●')).toHaveAttribute('aria-hidden', 'true')
  })
})
```

`src/components/browser-frame.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BrowserFrame } from './browser-frame'

describe('BrowserFrame', () => {
  it('shows the screenshot with its alt text', () => {
    render(
      <BrowserFrame
        url="https://lorem.example.com"
        image="/projects/placeholder.svg"
        alt="Screenshot of lorem"
      />,
    )
    const image = screen.getByRole('img', { name: 'Screenshot of lorem' })
    expect(image).toHaveAttribute('src', '/projects/placeholder.svg')
    expect(image).toHaveAttribute('loading', 'lazy')
  })

  it('shows the URL without its protocol', () => {
    render(
      <BrowserFrame
        url="https://lorem.example.com"
        image="/projects/placeholder.svg"
        alt="Screenshot of lorem"
      />,
    )
    expect(screen.getByText('lorem.example.com')).toBeInTheDocument()
  })
})
```

`src/components/terminal-frame.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TerminalFrame } from './terminal-frame'

const lines = [
  { text: 'ipsum pack ./lorem', tone: 'command' },
  { text: 'scanning 12,480 files …', tone: 'info' },
  { text: 'skipped 316 dolor entries', tone: 'warn' },
  { text: 'wrote lorem.tar.zst', tone: 'success' },
] as const

describe('TerminalFrame', () => {
  it('names the session after the project', () => {
    render(<TerminalFrame name="ipsum" lines={[...lines]} />)
    expect(screen.getByText('zsh — ipsum')).toBeInTheDocument()
  })

  it('prefixes commands and colors each line by its tone', () => {
    render(<TerminalFrame name="ipsum" lines={[...lines]} />)
    expect(screen.getByText('$ ipsum pack ./lorem')).toHaveClass(
      'text-foreground',
    )
    expect(screen.getByText('scanning 12,480 files …')).toHaveClass(
      'text-muted-foreground',
    )
    expect(screen.getByText('skipped 316 dolor entries')).toHaveClass(
      'text-warning',
    )
    expect(screen.getByText('wrote lorem.tar.zst')).toHaveClass('text-success')
  })

  it('stays dark in either theme and ends on a prompt', () => {
    const { container } = render(
      <TerminalFrame name="ipsum" lines={[...lines]} />,
    )
    expect(container.firstChild).toHaveClass('dark')
    expect(container.querySelector('pre')?.lastChild).toHaveTextContent(/^\$/)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/components/project-status.test.tsx src/components/browser-frame.test.tsx src/components/terminal-frame.test.tsx`
Expected: FAIL, as the three modules don't exist.

- [ ] **Step 3: Write the components**

`src/components/project-status.tsx`:

```tsx
import type { Status } from '@/lib/projects'

const DOT_COLORS: Record<Status, string> = {
  live: 'text-info',
  wip: 'text-warning',
  archived: 'text-muted-foreground',
}

type ProjectStatusProps = {
  status: Status
}

/**
 * A project's status as a colored dot and its label; the label always shows,
 * so color is never the only signal
 */
export const ProjectStatus = ({ status }: ProjectStatusProps) => (
  <span className="inline-flex items-baseline gap-1.5">
    <span aria-hidden="true" className={DOT_COLORS[status]}>
      ●
    </span>
    {status}
  </span>
)
```

`src/components/browser-frame.tsx`:

```tsx
type BrowserFrameProps = {
  url?: string
  image: string
  alt: string
}

/**
 * A website's screenshot in a browser window, with its address in the top bar
 */
export const BrowserFrame = ({ url, image, alt }: BrowserFrameProps) => (
  <figure className="overflow-hidden rounded-md border border-accent">
    <div className="flex items-center gap-1.5 border-accent border-b px-3 py-2">
      <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
      <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
      <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
      {url && (
        <span className="ml-2 truncate text-muted-foreground text-xs">
          {url.replace(/^https?:\/\//, '')}
        </span>
      )}
    </div>
    {/* The static export has no image optimizer, so next/image adds nothing */}
    <img
      src={image}
      alt={alt}
      loading="lazy"
      className="aspect-[16/10] w-full object-cover"
    />
  </figure>
)
```

`src/components/terminal-frame.tsx`:

```tsx
import { cn } from 'cn'

import type { TerminalLine, Tone } from '@/lib/projects'

const TONE_COLORS: Record<Tone, string> = {
  command: 'text-foreground',
  info: 'text-muted-foreground',
  warn: 'text-warning',
  success: 'text-success',
}

type TerminalFrameProps = {
  name: string
  lines: TerminalLine[]
}

/**
 * A scripted terminal session, as a still of what a CLI or library does. The
 * dark class gives everything inside the dark theme's tokens, so it stays dark
 * and its colors stay readable in the light theme too
 */
export const TerminalFrame = ({ name, lines }: TerminalFrameProps) => (
  <figure className="dark flex min-h-55 flex-col gap-3 rounded-md bg-secondary p-4 font-mono text-[13px] text-foreground leading-relaxed">
    <figcaption className="text-muted-foreground">zsh — {name}</figcaption>
    <pre className="whitespace-pre-wrap font-mono">
      {lines.map(({ text, tone }, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: the lines are static and never reorder
        <span key={index} className={cn('block', TONE_COLORS[tone])}>
          {tone === 'command' ? `$ ${text}` : text}
        </span>
      ))}
      <span className="block">
        ${' '}
        <span
          aria-hidden="true"
          className="inline-block h-[1.1em] w-[0.6em] translate-y-[0.15em] bg-foreground"
        />
      </span>
    </pre>
  </figure>
)
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/project-status.test.tsx src/components/browser-frame.test.tsx src/components/terminal-frame.test.tsx`
Expected: PASS, 8 tests.

- [ ] **Step 5: Add the stories**

`src/components/project-status.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ProjectStatus } from './project-status'

const meta = {
  component: ProjectStatus,
  decorators: [
    (Story) => (
      <div className="font-mono">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProjectStatus>

export default meta

type Story = StoryObj<typeof meta>

export const Live: Story = { args: { status: 'live' } }

export const Wip: Story = { args: { status: 'wip' } }

export const Archived: Story = { args: { status: 'archived' } }
```

`src/components/browser-frame.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { BrowserFrame } from './browser-frame'

const meta = {
  component: BrowserFrame,
  decorators: [
    (Story) => (
      <div className="w-160 font-mono">
        <Story />
      </div>
    ),
  ],
  args: {
    url: 'https://lorem.example.com',
    image: '/projects/placeholder.svg',
    alt: 'Screenshot of lorem',
  },
} satisfies Meta<typeof BrowserFrame>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
```

`src/components/terminal-frame.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { getProjects } from '@/lib/projects'

import { TerminalFrame } from './terminal-frame'

const ipsum = getProjects().find(({ slug }) => slug === 'ipsum')

const meta = {
  component: TerminalFrame,
  decorators: [
    (Story) => (
      <div className="w-160">
        <Story />
      </div>
    ),
  ],
  args: {
    name: 'ipsum',
    lines: ipsum?.preview.terminal ?? [],
  },
} satisfies Meta<typeof TerminalFrame>

export default meta

type Story = StoryObj<typeof meta>

// Stays dark in the light theme too
export const Default: Story = {}
```

- [ ] **Step 6: Run the checks and commit**

```bash
npm run lint && npm run typecheck && npm test && npm run build && npm run build-storybook
git add src/components/project-status.* src/components/browser-frame.* src/components/terminal-frame.*
git commit -m "feat: add the project status and preview frames" -m "Refs #73" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task 5: Project details

**Files:**
- Create: `src/components/project-details.tsx` (+ `.test.tsx`, `.stories.tsx`)

**Interfaces:**
- Consumes: `Project`, `ProjectType` from Task 3; `getLinkTargetProps` from `src/components/link-list.tsx`.
- Produces: `ProjectDetails({ project: Project })`.

- [ ] **Step 1: Write the failing test**

`src/components/project-details.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
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

const linkNames = () =>
  screen.queryAllByRole('link').map((link) => link.textContent)

describe('ProjectDetails', () => {
  it('shows the description, stack, role and year', () => {
    render(<ProjectDetails project={project} />)
    expect(screen.getByText('Lorem ipsum dolor sit amet.')).toBeInTheDocument()
    expect(screen.getByText('next.js · mdx')).toBeInTheDocument()
    expect(screen.getByText('design + build')).toBeInTheDocument()
    expect(screen.getByText('2026')).toBeInTheDocument()
  })

  it.each([
    ['web', '→ visit site'],
    ['cli', '→ install'],
    ['lib', '→ npm'],
  ] as const)('labels the primary link of a %s project', (type, label) => {
    render(<ProjectDetails project={{ ...project, type }} />)
    expect(linkNames()).toEqual([label, '→ source', '→ write-up'])
  })

  it('opens the links in a new tab', () => {
    render(<ProjectDetails project={project} />)
    expect(screen.getByRole('link', { name: 'visit site' })).toHaveAttribute(
      'target',
      '_blank',
    )
  })

  it('leaves out links without a URL', () => {
    render(
      <ProjectDetails
        project={{ ...project, links: { source: 'https://example.com' } }}
      />,
    )
    expect(linkNames()).toEqual(['→ source'])
  })

  it('renders no link list without links', () => {
    render(<ProjectDetails project={{ ...project, links: {} }} />)
    expect(screen.queryByRole('list')).toBeNull()
    expect(within(document.body).queryAllByRole('link')).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/project-details.test.tsx`
Expected: FAIL, because `./project-details` doesn't exist.

- [ ] **Step 3: Write the component**

`src/components/project-details.tsx`:

```tsx
import { getLinkTargetProps } from '@/components/link-list'
import type { Project, ProjectType } from '@/lib/projects'

const PRIMARY_LABELS: Record<ProjectType, string> = {
  web: 'visit site',
  cli: 'install',
  lib: 'npm',
}

type ProjectDetailsProps = {
  project: Project
}

/**
 * A project's description, facts and links, in columns that stack when
 * narrow. Stack and year are here too, as narrow tables hide their columns
 */
export const ProjectDetails = ({ project }: ProjectDetailsProps) => {
  const { type, description, stack, role, year, links } = project
  const items = [
    { label: PRIMARY_LABELS[type], url: links.primary },
    { label: 'source', url: links.source },
    { label: 'write-up', url: links.writeup },
  ].filter((item): item is { label: string; url: string } => Boolean(item.url))

  return (
    <div className="flex flex-wrap gap-8">
      <p className="flex-[2_1_16rem]">{description}</p>
      <dl className="grid flex-[1_1_12rem] grid-cols-[72px_1fr] content-start gap-x-2">
        <dt className="text-muted-foreground">stack</dt>
        <dd>{stack.join(' · ')}</dd>
        <dt className="text-muted-foreground">role</dt>
        <dd>{role}</dd>
        <dt className="text-muted-foreground">year</dt>
        <dd>{year}</dd>
      </dl>
      {items.length > 0 && (
        <ul className="flex flex-[1_1_10rem] flex-wrap content-start gap-x-4">
          {items.map(({ label, url }) => (
            <li key={label}>
              <a
                className="hover:text-highlight"
                href={url}
                {...getLinkTargetProps(url)}
              >
                <span aria-hidden="true">→ </span>
                {label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

`screen.getByRole('link', { name: 'visit site' })` matches because the arrow is `aria-hidden`; `textContent` still includes it, as `linkNames` expects.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/project-details.test.tsx`
Expected: PASS, 7 tests.

- [ ] **Step 5: Add the story**

`src/components/project-details.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { getProjects } from '@/lib/projects'

import { ProjectDetails } from './project-details'

const [lorem] = getProjects()

const meta = {
  component: ProjectDetails,
  decorators: [
    (Story) => (
      <div className="w-[45vw] font-mono text-[15px] leading-[1.6]">
        <Story />
      </div>
    ),
  ],
  args: { project: lorem },
} satisfies Meta<typeof ProjectDetails>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithoutLinks: Story = {
  args: { project: { ...lorem, links: {} } },
}
```

- [ ] **Step 6: Run the checks and commit**

```bash
npm run lint && npm run typecheck && npm test && npm run build && npm run build-storybook
git add src/components/project-details.*
git commit -m "feat: add the project details" -m "Refs #73" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task 6: The index and the page

**Files:**
- Create: `src/components/ui/accordion.tsx` (+ `.stories.tsx`)
- Create: `src/components/project-index.tsx` (+ `.test.tsx`, `.stories.tsx`)
- Modify: `src/app/projects/page.tsx`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: everything from Tasks 1, 3, 4 and 5.
- Produces: `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`; `ProjectIndex({ projects: Project[] })`.

- [ ] **Step 1: Write the failing test**

`src/components/project-index.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { getProjects } from '@/lib/projects'

import { ProjectIndex } from './project-index'

const projects = getProjects()

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

  it('names each row by its type, name and status, without the dot or marker', () => {
    render(<ProjectIndex projects={projects} />)
    const lorem = row(/^web\s*lorem/)
    expect(lorem).toHaveAccessibleName(/^web\s*lorem.*live$/)
    expect(lorem).not.toHaveAccessibleName(/[●+]/)
  })

  it('opens a row to its preview and details', async () => {
    const user = userEvent.setup()
    render(<ProjectIndex projects={projects} />)

    await user.click(row(/^web\s*lorem/))

    expect(row(/^web\s*lorem/)).toHaveAttribute('aria-expanded', 'true')
    expect(
      screen.getByRole('img', { name: 'Screenshot of lorem' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'visit site' })).toBeInTheDocument()
  })

  it('keeps one row open at a time, and closes an open row on a click', async () => {
    const user = userEvent.setup()
    render(<ProjectIndex projects={projects} />)

    await user.click(row(/^web\s*lorem/))
    await user.click(row(/^cli\s*ipsum/))
    expect(row(/^web\s*lorem/)).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('zsh — ipsum')).toBeInTheDocument()

    await user.click(row(/^cli\s*ipsum/))
    expect(row(/^cli\s*ipsum/)).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('zsh — ipsum')).toBeNull()
  })

  it('shows no preview for a project without one', async () => {
    const user = userEvent.setup()
    render(<ProjectIndex projects={projects} />)

    await user.click(row(/^lib\s*adipiscing/))

    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.queryByText(/^zsh/)).toBeNull()
    expect(screen.getByText(/^Nemo enim/)).toBeInTheDocument()
  })

  it('hides the header row from screen readers', () => {
    const { container } = render(<ProjectIndex projects={projects} />)
    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent(
      'typenamestackyearstatus',
    )
  })
})
```

jsdom applies no CSS, so it joins the cells of a row's name without spaces, and the hidden `stack` and `year` cells still count; in a browser, grid cells are separated by spaces and a narrow table drops the hidden ones. The tests match names with `\s*` between the parts for that reason.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/project-index.test.tsx`
Expected: FAIL, because `./project-index` doesn't exist.

- [ ] **Step 3: Write the accordion**

`src/components/ui/accordion.tsx`, written by hand with the structure of the shadcn component (the registry's version imports an icon helper that only exists on the shadcn website):

```tsx
'use client'

import { cn } from 'cn'
import { Accordion as AccordionPrimitive } from 'radix-ui'
import type * as React from 'react'

function Accordion(
  props: React.ComponentProps<typeof AccordionPrimitive.Root>,
) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn('border-accent border-b', className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    // A div, not Radix's default h3: the rows aren't headings
    <AccordionPrimitive.Header asChild>
      <div>
        <AccordionPrimitive.Trigger
          data-slot="accordion-trigger"
          className={cn(
            'w-full cursor-pointer text-left outline-none focus-visible:outline-2 focus-visible:outline-info focus-visible:-outline-offset-2',
            className,
          )}
          {...props}
        />
      </div>
    </AccordionPrimitive.Header>
  )
}

// Opens and closes without a transition
function AccordionContent(
  props: React.ComponentProps<typeof AccordionPrimitive.Content>,
) {
  return <AccordionPrimitive.Content data-slot="accordion-content" {...props} />
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger }
```

- [ ] **Step 4: Write the index**

`src/components/project-index.tsx`:

```tsx
'use client'

import { cn } from 'cn'

import { BrowserFrame } from '@/components/browser-frame'
import { ProjectDetails } from '@/components/project-details'
import { ProjectStatus } from '@/components/project-status'
import { TerminalFrame } from '@/components/terminal-frame'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import type { Project } from '@/lib/projects'

// Narrow tables show type, name, status and the marker; from 32rem wide (the
// table's own width) they add stack and year
const COLUMNS =
  'grid grid-cols-[44px_1fr_84px_20px] gap-x-4 @lg:grid-cols-[56px_2fr_2fr_56px_96px_24px]'
const WIDE_ONLY = 'hidden @lg:block'

const ProjectPreview = ({ project }: { project: Project }) => {
  const { type, name, url, preview } = project

  if (type === 'web' && preview.image) {
    return (
      <BrowserFrame
        url={url}
        image={preview.image}
        alt={`Screenshot of ${name}`}
      />
    )
  }
  if (type !== 'web' && preview.terminal) {
    return <TerminalFrame name={name} lines={preview.terminal} />
  }
  return null
}

type ProjectIndexProps = {
  projects: Project[]
}

/**
 * The projects as an ls -l style table: one row per project, which opens to a
 * preview and details. One row is open at a time
 */
export const ProjectIndex = ({ projects }: ProjectIndexProps) => (
  <div className="@container font-mono text-[15px] leading-[1.6]">
    {/* Each row's button reads out its own values */}
    <div
      aria-hidden="true"
      className={cn(
        COLUMNS,
        'items-baseline border-t border-t-foreground border-b border-b-accent py-2 text-muted-foreground text-xs',
      )}
    >
      <span>type</span>
      <span>name</span>
      <span className={WIDE_ONLY}>stack</span>
      <span className={WIDE_ONLY}>year</span>
      <span>status</span>
      <span />
    </div>
    <Accordion type="single" collapsible>
      {projects.map((project) => (
        <AccordionItem key={project.slug} value={project.slug}>
          <AccordionTrigger
            className={cn(
              COLUMNS,
              'group min-h-13 items-baseline py-3.5 hover:bg-secondary',
            )}
          >
            <span className="text-muted-foreground">{project.type}</span>
            <span>{project.name}</span>
            <span className={WIDE_ONLY}>{project.stack.join(' · ')}</span>
            <span className={WIDE_ONLY}>{project.year}</span>
            <ProjectStatus status={project.status} />
            <span
              aria-hidden="true"
              className="text-right text-muted-foreground before:content-['+'] group-data-[state=open]:before:content-['−']"
            />
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-8 pt-2 pb-8">
            <ProjectPreview project={project} />
            <ProjectDetails project={project} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  </div>
)
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/components/project-index.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 6: Replace the page**

`src/app/projects/page.tsx`:

```tsx
import type { Metadata } from 'next'

import { ProjectIndex } from '@/components/project-index'
import { getProjects } from '@/lib/projects'

export const metadata: Metadata = {
  title: 'Projects',
}

export default function Page() {
  return (
    <div className="md:mr-[10%] md:ml-[45%]">
      {/* Nothing visible precedes the table, so the heading is only for
          screen readers */}
      <h1 className="sr-only">Projects</h1>
      <ProjectIndex projects={getProjects()} />
    </div>
  )
}
```

- [ ] **Step 7: Add the stories**

`src/components/ui/accordion.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './accordion'

const meta = {
  component: Accordion,
  decorators: [
    (Story) => (
      <div className="w-96 font-mono">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Accordion>

export default meta

type Story = StoryObj<typeof meta>

export const Single: Story = {
  render: () => (
    <Accordion type="single" collapsible defaultValue="lorem">
      <AccordionItem value="lorem">
        <AccordionTrigger className="py-3">lorem</AccordionTrigger>
        <AccordionContent className="pb-3">
          Lorem ipsum dolor sit amet.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="ipsum">
        <AccordionTrigger className="py-3">ipsum</AccordionTrigger>
        <AccordionContent className="pb-3">
          Ut enim ad minim veniam.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}
```

`src/components/project-index.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { getProjects } from '@/lib/projects'

import { ProjectIndex } from './project-index'

const meta = {
  component: ProjectIndex,
  args: { projects: getProjects() },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ProjectIndex>

export default meta

type Story = StoryObj<typeof meta>

// Open a row to see its preview; narrow the window to see the phone layout
export const Default: Story = {}

export const OnPhone: Story = {
  globals: {
    viewport: { value: 'mobile1', isRotated: false },
  },
}
```

- [ ] **Step 8: Update `CLAUDE.md`**

- In the architecture block:
  - `src/lib/` adds `projects.ts (projects: validated, newest first; safe in the browser)`;
  - `content/` adds `projects.json (projects page)`.
- "Server components by default": the client components are `theme-provider`, `theme-selector`, `particle-canvas`, `nav-link`, `mobile-menu`, `project-index`, and the generated `src/components/ui/dropdown-menu` and `src/components/ui/accordion`.
- "Styling": the tokens list adds "`info`, `warning` and `success` (from Shiki's GitHub themes)".
- A new bullet after "Posts": "**Projects** are `content/projects.json`, checked by `getProjects()` in `src/lib/projects.ts`; a missing or unknown value fails the build, named by the project's slug. `/projects/` renders them as an `ls -l` style table (`ProjectIndex`, a Radix Accordion with one row open at a time) whose columns follow the table's own width (container queries). A row opens to a `BrowserFrame` (web) or a `TerminalFrame` (cli, lib) and `ProjectDetails`. The terminal frame has the `dark` class, so it uses the dark theme's tokens in both themes. Recordings and videos (`preview.recording`, `preview.video`) aren't rendered yet."
- A new bullet: "**The navigation marks the current page:** `NavLink` (a client component, `usePathname`, ignoring the trailing slash) gives it the `default` button style and `aria-current="page"`; `MobileMenu` marks its current item the same way."

- [ ] **Step 9: Check it in the browser**

With `npm run dev` at `/projects/`:

- **1512px:** the table starts at 45% of the width with all five columns; rows are at least 52px; hover shows the `secondary` background; opening a row shows the screenshot at full width with the details in columns beneath; opening another closes it.
- **768px:** the 45% column is narrow, so the table shows type, name and status; stack and year appear in the opened details.
- **375px:** the table uses the full width, and `document.documentElement.scrollWidth === innerWidth`.
- **Both themes:** the status dots, and the terminal frame staying dark with readable warning and success lines in the light theme.
- **Keyboard:** Tab reaches the rows with a visible blue outline, Enter opens and closes, the arrow keys move between rows.
- **Navigation:** the current page's button is black (light) or white (dark) on `/`, `/about/`, `/projects/` and `/posts/`, and in the phone menu.
- **Console:** no errors.

- [ ] **Step 10: Run the checks and commit**

```bash
npm run lint && npm run typecheck && npm test && npm run build && npm run build-storybook
git add src/components/ui/accordion.tsx src/components/ui/accordion.stories.tsx src/components/project-index.tsx src/components/project-index.test.tsx src/components/project-index.stories.tsx src/app/projects/page.tsx CLAUDE.md
git commit -m "feat: replace the projects page's coming soon with the project index" -m "Refs #73" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

Then update the pull request description with the commit list, mark it ready and wait for CI.

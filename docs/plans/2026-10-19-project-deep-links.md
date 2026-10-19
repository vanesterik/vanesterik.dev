# Deep links to a project: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, in this session, on the branch `feat/project-deep-links`. Subagents may review; they never implement (see `~/.claude/CLAUDE.md`). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/projects/<slug>/` opens the projects page with that row open, the address follows the open row, and the navigation marks a section current below it. This is story #85.

**Architecture:** Three tasks, one commit each:

1. `isCurrentPath` matches the pages below a section (`NavLink`, `MobileMenu`).
2. `ProjectIndex` takes its open row from the path, replaces the address on the projects route, and scrolls a deep-linked row into view.
3. The `/projects/<slug>/` route with its metadata, `metadataBase` in the root layout, and `CLAUDE.md`.

**Tech stack:** Next.js 16.4 App Router (static export), React 19, Radix Accordion via `src/components/ui/accordion.tsx`, Vitest with Testing Library.

**Spec:** `docs/specs/2026-10-19-project-deep-links-design.md` (this pull request's first commit).

## Global constraints

- **Static export:** every `/projects/<slug>/` is a prerendered file; `dynamicParams = false`.
- **No hydration mismatch:** the open row comes from `usePathname()` on the server and the client alike.
- **History:** only `history.replaceState`, never `pushState`; only while the path is `/projects/` or below.
- **Base path:** addresses are built with `withBasePath` from `src/lib/base-path.ts`; `usePathname()` returns paths without it.
- **Before each commit:** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Push one commit at a time and wait for CI.
- **Commit messages:** conventional, lowercase subject, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review focus

1. **A slug that is also a prefix of another path** (`/projects/foo/bar/`): no row opens (only a single segment counts), and no page is generated for it. Test in Task 2 (`openSlugFromPath`).
2. **The router's update after `replaceState` arriving late:** the row must open on the click, not a frame later. Local state set on click (Task 2 test: open immediately after the click with the mocked path unchanged).
3. **Back after leaving the page:** the row named by the address is open. Covered by the path-change test in Task 2 and the browser check in Task 3.
4. **Storybook's preview URL:** untouched when a row opens (Task 2 test on a `null`/`/` path; browser check in Task 3).
5. **Reduced motion:** no smooth scroll (Task 2 test).

---

### Task 1: Mark a section current on the pages below it

**Files:**
- Modify: `src/components/nav-link.tsx`, `src/components/nav-link.test.tsx`, `src/components/mobile-menu.test.tsx`

**Interfaces:**
- Produces: `isCurrentPath(pathname: string | null, url: string): boolean`, same signature, now also true below `url` (except `/`).

- [ ] **Step 1: Write the failing tests.** In `nav-link.test.tsx`, `describe('isCurrentPath')`:
  - `it('matches the pages below a section')`: `isCurrentPath('/projects/zsh-git-alias/', '/projects')` and `isCurrentPath('/posts/a-post/', '/posts')` are `true`.
  - `it('needs a whole segment')`: `isCurrentPath('/projectsfoo/', '/projects')` is `false`.
  - The existing "matches home only on the home page" stays (`/projects/` vs `/` is `false`).
  - `describe('NavLink')`, `it('marks its section on a page below it')`: `pathname.value = '/projects/zsh-git-alias/'`, the "projects" link has `aria-current="page"`.

  In `mobile-menu.test.tsx`, `it('marks its section on a page below it')`: `pathname.value = '/posts/a-post/'`, open the menu, the "posts" item has `aria-current="page"`.

- [ ] **Step 2: Run** `npx vitest run src/components/nav-link.test.tsx src/components/mobile-menu.test.tsx`. Expected: the new tests FAIL, the rest pass.

- [ ] **Step 3: Implement** in `isCurrentPath`: with both sides without a trailing slash, `path === url || (url !== '/' && path.startsWith(`${url}/`))`. Update the doc comment ("is the page being shown, or a page below it").

- [ ] **Step 4: Run** the same command. Expected: PASS.

- [ ] **Step 5: Verify and commit**

```bash
npm run lint && npm run typecheck && npm test && npm run build
git add src/components/nav-link.tsx src/components/nav-link.test.tsx src/components/mobile-menu.test.tsx
git commit -m "feat: mark a section current on the pages below it"
git push
```

### Task 2: Open the row the address names

**Files:**
- Modify: `src/components/project-index.tsx`, `src/components/project-index.test.tsx`

**Interfaces:**
- Produces: `export const openSlugFromPath = (pathname: string | null, slugs: string[]): string` (`''` for none). `ProjectIndex`'s props are unchanged (`{ projects: Project[] }`).

- [ ] **Step 1: Write the failing tests** in `project-index.test.tsx`. Mock `next/navigation` with a hoisted `pathname` (`{ value: null as string | null }`, reset in `beforeEach`), as in `nav-link.test.tsx`; the existing tests then run on a `null` path, as today. Stub `Element.prototype.scrollIntoView` and `window.matchMedia` in `beforeEach`; spy on `history.replaceState` and `history.pushState`.
  - `describe('openSlugFromPath')`: `('/projects/ipsum/', slugs)` → `'ipsum'`; `'/projects/ipsum'` → `'ipsum'`; `'/projects/'`, `'/projects/unknown/'`, `'/projects/ipsum/extra/'`, `'/'`, `null` → `''`.
  - `it('opens the row the address names')`: path `/projects/ipsum/`; ipsum `aria-expanded="true"`, every other row `"false"`.
  - `it('follows the address when it changes')`: render on `/projects/ipsum/`, set the path to `/projects/` and `rerender`; every row closed. Set it to `/projects/lorem/` and `rerender`; lorem open.
  - `it('replaces the address as rows open and close')`: path `/projects/`; click lorem → lorem open at once (path mock unchanged) and `replaceState` called with `(null, '', '/projects/lorem/')`; click lorem again → `(null, '', '/projects/')`; `pushState` never called.
  - `it('leaves the address alone off the projects route')`: path `/`; click lorem → open; `replaceState` not called.
  - `it('scrolls a deep-linked row into view')`: path `/projects/ipsum/`; `scrollIntoView` called once with `{ block: 'start', behavior: 'smooth' }`; with `matchMedia` returning `matches: true` for `(prefers-reduced-motion: reduce)`, `behavior: 'auto'`. On `/projects/`, not called.

- [ ] **Step 2: Run** `npx vitest run src/components/project-index.test.tsx`. Expected: the new tests FAIL (`openSlugFromPath` not exported), the existing ones pass.

- [ ] **Step 3: Implement** in `src/components/project-index.tsx`:
  - `openSlugFromPath`: strip one trailing slash, match `/^\/projects\/([^/]+)$/`, return the slug if it's in `slugs`, else `''`.
  - In `ProjectIndex`: `const pathname = usePathname()`; `const fromPath = openSlugFromPath(pathname, slugs)`; local `open` state initialised to `fromPath`, and set to `fromPath` whenever `fromPath` changes (React's "adjust state when a prop changes" pattern: keep the last `fromPath` in state and compare during render; no effect).
  - `onValueChange(value)`: set `open`; when `pathname` is `/projects` or starts with `/projects/`, `window.history.replaceState(null, '', withBasePath(value ? `/projects/${value}/` : '/projects/'))`.
  - Accordion: `value={open}` and `onValueChange` instead of uncontrolled; `type="single" collapsible` stay.
  - Mount effect (empty deps): if `fromPath`, find the item (`data-slug={project.slug}` on `AccordionItem`, `querySelector` from a ref on the wrapper) and `scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })`.
  - Update the component's doc comment: the address decides the open row.

- [ ] **Step 4: Run** `npx vitest run src/components/project-index.test.tsx`. Expected: PASS.

- [ ] **Step 5: Verify and commit**

```bash
npm run lint && npm run typecheck && npm test && npm run build
git add src/components/project-index.tsx src/components/project-index.test.tsx
git commit -m "feat: open the project row the address names"
git push
```

### Task 3: A page per project path

**Files:**
- Create: `src/app/projects/projects-page.tsx`, `src/app/projects/[slug]/page.tsx`
- Modify: `src/app/projects/page.tsx`, `src/app/layout.tsx`, `CLAUDE.md`

**Interfaces:**
- Consumes: Task 2's `ProjectIndex` (opens the row from the path by itself).
- Produces: `ProjectsPage(): JSX.Element` (server component), the routes.

- [ ] **Step 1: Move the body.** `projects-page.tsx` exports `ProjectsPage`, the current `page.tsx` body (the column, the `sr-only` `<h1>` and its comment, `<ProjectIndex projects={getProjects()} />`). `page.tsx` keeps `metadata` (`title: 'Projects'`) and renders `<ProjectsPage />`.

- [ ] **Step 2: Add the route** `src/app/projects/[slug]/page.tsx`, after `src/app/posts/[slug]/page.tsx`: `dynamicParams = false`; `generateStaticParams = () => getProjects().map(({ slug }) => ({ slug }))`; `generateMetadata` finds the project by slug and returns `{ title: `${project.name} · Projects`, alternates: { canonical: '/projects/' } }`; the page renders `<ProjectsPage />`.

- [ ] **Step 3: Set `metadataBase`** in `src/app/layout.tsx`: `export const metadata: Metadata = { metadataBase: new URL('https://www.vanesterik.dev') }` (import the `Metadata` type).

- [ ] **Step 4: Build and check the output.** `npm run build`. Expected: passes, and for `zsh-git-alias`:
  - `out/projects/zsh-git-alias/index.html` exists, contains `<title>zsh-git-alias · Projects</title>` and `<link rel="canonical" href="https://www.vanesterik.dev/projects/"/>`, and its zsh-git-alias trigger has `aria-expanded="true"` (every other `"false"`);
  - `out/projects/index.html` has every trigger `aria-expanded="false"`;
  - `out/projects/unknown/` doesn't exist; no file under `out/projects/` other than the slugs' folders, `index.html`, `index.txt` and the screenshots.

- [ ] **Step 5: Check in the browser** (`npx serve out`):
  - `/projects/zsh-git-alias/` opens with that row open, scrolled below the sticky header, "Projects" marked in the navigation;
  - clicking another row: the address becomes its path; closing it: `/projects/`; Back then leaves the page;
  - open a row, go to About, Back: the same row is open; click "Projects" with a row open: every row closes;
  - reload on a deep link keeps the row; with JavaScript disabled, the deep link shows the row open;
  - `/projects/unknown/` is the 404 page;
  - Storybook (`npm run storybook`): opening a row in ProjectIndex's story leaves the preview's URL unchanged.

- [ ] **Step 6: Document** in `CLAUDE.md`: in "Projects", `/projects/<slug>/` (`src/app/projects/[slug]/page.tsx`, one prerendered page per slug, the same `ProjectsPage`) opens with that row open; `ProjectIndex` takes the open row from `usePathname()` and replaces the address with `history.replaceState` on the projects route only; a deep-linked row scrolls into view on load. In the navigation paragraph, a section is also current on the pages below it (`/projects/<slug>/`, `/posts/<slug>/`), home only on `/`. In the architecture notes, the root layout sets `metadataBase`.

- [ ] **Step 7: Verify and commit**

```bash
npm run lint && npm run typecheck && npm test && npm run build
git add src/app/projects src/app/layout.tsx CLAUDE.md
git commit -m "feat: give each project a path on the projects page"
git push
```

Then update the pull request's commit list and mark it ready for review.

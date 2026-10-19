# Deep links to a project on the projects page

Status: approved in conversation on 2026-10-19, for story #85.

## Purpose

`/projects/` lists the projects in `ProjectIndex` (`src/components/project-index.tsx`), a Radix Accordion with one row open at a time. The open row is internal state, so the page always loads with every row closed, and one project can't be shared or bookmarked.

A path per project, `/projects/<slug>/`, should open the projects page with that row open. `/projects/` stays the only projects page: there's no page per project, and no `#` or query string.

Success means:
- a shared `/projects/<slug>/` link opens the page with that row open, in the static HTML, without JavaScript;
- opening and closing rows keeps the address in step, without adding history entries;
- the navigation marks "Projects" (and "Posts" on a post) on the pages below it.

## Non-goals

From the issue: a "copy link" button, and a separate page per project. Also: no scroll or address change when a row is opened by clicking (only the address changes), and no change to the Accordion's look or animation.

## Decisions

| Topic | Decision |
|---|---|
| Route | A new `src/app/projects/[slug]/page.tsx` beside `src/app/projects/page.tsx`. `generateStaticParams` returns every slug from `getProjects()`, and `dynamicParams = false`, as on `/posts/<slug>/`, so any other path under `/projects/` is the site's 404. *My call* (rather than one optional catch-all route) |
| Shared page body | Both pages render the same body, a small server component, `ProjectsPage` (in `src/app/projects/projects-page.tsx`), with the `sr-only` `<h1>` and `<ProjectIndex projects={…} />`. The `[slug]` route exists to prerender each path and give it metadata; it passes nothing extra |
| The address decides the open row | `ProjectIndex` reads the open row from `usePathname()`: on `/projects/<slug>/` with a known slug, that row; otherwise none. Each page is prerendered with its own path, so the static HTML and the first client render open the same row, without a hydration mismatch. Because the row follows the address, Back, Forward and reload always show the row their address names, and a click on "Projects" in the navigation (`/projects/`) shows every row closed, however the page was reached. *My call, after the builder check:* Next restores a history entry's rendered tree, not the open row, so a prop set at first render would disagree with the address after Back |
| Address | Opening a row calls `window.history.replaceState(null, '', path)` with `${basePath}/projects/<slug>/`, or `${basePath}/projects/` when every row is closed (base path from `NEXT_PUBLIC_BASE_PATH`, as in `src/lib/base-path.ts`). Next 16 patches `replaceState` to update `usePathname` (which returns the path without the base path), so the open row and the navigation follow. The component also keeps the open row in local state, set on click, so the row opens at once rather than after the router's update; when the path changes, the state follows it. The Accordion is controlled with `value` (`''` when closed) |
| Only on the projects route | The address is replaced only while `usePathname()` is `/projects/` or below. Elsewhere (Storybook, whose path isn't a projects path, and tests that don't set one) rows open in local state alone and the URL is left alone. *My call, after the builder check* |
| Scroll | On mount, when the path names a row, the open row's item is scrolled into view with `scrollIntoView({ block: 'start', behavior })`, `behavior` being `'auto'` under `prefers-reduced-motion: reduce` and `'smooth'` otherwise. `<html>`'s `md:scroll-pt-24` keeps it clear of the sticky header. Only on mount, never on a click |
| Metadata | `/projects/<slug>/` sets `title: '<name> · Projects'` and `alternates: { canonical: '/projects/' }`. The root layout gets `metadataBase: new URL('https://www.vanesterik.dev')`, so the canonical is absolute. *My call* (title format; `metadataBase`) |
| Current section | `isCurrentPath(pathname, url)` in `src/components/nav-link.tsx` also matches a path below `url` (`/projects/zsh-git-alias/` for `/projects`), except for `/`, which matches only itself. `NavLink` and `MobileMenu` already use it |

## Units

### `src/components/nav-link.tsx`

`isCurrentPath(pathname: string | null, url: string): boolean`: after removing trailing slashes, `true` when the path equals `url`, or when `url` isn't `/` and the path starts with `url + '/'`. `/projectsfoo` doesn't match `/projects`.

### `src/components/project-index.tsx`

`ProjectIndex({ projects }: { projects: Project[] })`, unchanged. A client component already. Derives the open slug from `usePathname()` (a small pure helper, `openSlugFromPath(pathname: string | null, slugs: string[]): string`, returning `''` for none, exported for tests), keeps it in local state that follows the path, and on change sets the state and, on the projects route, replaces the address. One `useEffect` on mount scrolls the initial row into view (its `AccordionItem`, found by ref or `data-slug`; left to the builder).

### `src/app/projects/projects-page.tsx`, `page.tsx`, `[slug]/page.tsx`

`page.tsx` renders `<ProjectsPage />` and keeps `title: 'Projects'`. `[slug]/page.tsx` has `generateStaticParams`, `dynamicParams = false`, `generateMetadata` (looks the project up by slug) and renders `<ProjectsPage />`.

### `src/app/layout.tsx`

`export const metadata: Metadata = { metadataBase: new URL('https://www.vanesterik.dev') }`. Pages' own titles still apply.

### `CLAUDE.md`

The "Projects" paragraph mentions `/projects/<slug>/`, and the navigation paragraph mentions that a section is current on the pages below it.

## Testing

- **`nav-link.test.tsx`:** `isCurrentPath('/projects/zsh-git-alias/', '/projects')` and `('/posts/a-post/', '/posts')` are true; `('/projectsfoo/', '/projects')` and `('/projects/', '/')` are false; `NavLink` "projects" is current on `/projects/zsh-git-alias/`.
- **`mobile-menu.test.tsx`:** the "posts" item is current on `/posts/a-post/`.
- **`project-index.test.tsx`:**
  - `openSlugFromPath`: `/projects/ipsum/` gives `ipsum`; `/projects/`, `/projects/unknown/`, `/` and `null` give `''`;
  - on `/projects/ipsum/` (mocked `usePathname`), the ipsum row is expanded on first render and the others aren't;
  - when the mocked path changes to `/projects/`, every row closes (Back, or the navigation's link);
  - on `/projects/`, opening a row replaces the address with `/projects/<slug>/` (spy on `history.replaceState`), closing it with `/projects/`, and `history.pushState` is never called;
  - on `/` (as in Storybook), opening a row opens it and doesn't touch the address;
  - on `/projects/ipsum/`, the row is scrolled into view on mount (`scrollIntoView` stubbed), with `behavior: 'auto'` when `matchMedia('(prefers-reduced-motion: reduce)')` matches.
- **Build:** `out/projects/<slug>/index.html` exists for every project, with that row's `data-state="open"` and a `<link rel="canonical" href="https://www.vanesterik.dev/projects/">`; `out/projects/unknown/` doesn't.
- **Browser** (`npx serve out`): a deep link opens and scrolls to its row below the header; clicking rows changes the address and Back leaves the page; open a row, go to About, press Back: the same row is open; click "Projects" with a row open: every row closes; reload keeps the row; Storybook's preview URL doesn't change when a row opens; with JavaScript off, the deep link shows the row open.

## Left to the builder

How the mounted row is found for scrolling, and whether `matchMedia` is read in the effect or a tiny helper.

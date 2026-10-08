# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The global `~/.claude/CLAUDE.md` (development workflow, branching, pull requests, issue tracking, documentation conventions) applies here as well. This file holds only what is specific to this project, and wins where the two disagree.

## Project

Showcase website of [@vanesterik](https://github.com/vanesterik): a statically exported Next.js site, hosted on AWS S3. The GitHub repository is `vanesterik/vanesterik.dev`. User stories and epics go on the project board [vanesterik.dev](https://github.com/users/vanesterik/projects/4) (user project 4: `gh project item-add 4 --owner vanesterik --url <issue-url>`).

The repository is being overhauled under epic #32; the design is in `docs/specs/2026-10-08-repository-overhaul-design.md`.

## Commands

One npm package on Node 24 (`.nvmrc`).

```bash
npm install
npm run dev          # development server
npm run build        # static export to out/
npm run lint         # Biome lint and format check
npm run format       # apply Biome fixes
npm run typecheck    # next typegen && tsc --noEmit
npm test             # Vitest, single run
npm run test:watch
npm run coverage
npm run storybook        # Storybook on http://localhost:6006
npm run build-storybook  # static Storybook in storybook-static/
```

Run a single test file or filter by name:

```bash
npx vitest run components/link-list.test.tsx
npx vitest run -t "applies the dark theme"
```

There is no `start` script: `next start` doesn't serve a static export. Use `npx serve out` to look at a build.

## Git hooks and commit messages

Husky runs on every commit:

- **pre-commit**: `npm run typecheck`, then lint-staged (`biome check --write` on staged files).
- **commit-msg**: commitlint with `@commitlint/config-conventional`. The subject must not be sentence case, start case or pascal case, so write `feat: add posts page`, not `feat: Add posts page`.

Releases use `commit-and-tag-version` (`npm run release`), which bumps the version, updates `CHANGELOG.md` and creates a `v*.*.*` tag. Pushing that tag deploys production, so releasing is Koen's call. `.versionrc.json` sets the changelog's GitHub links explicitly, because the tool reads the repository name from the remote as `vanesterik` (it drops the `.dev`).

## Architecture

```
app/          App Router: layout.tsx (shell, fonts, theme provider), pages, not-found, globals.css, fonts/
components/   site components, tests next to each (*.test.tsx); ui/ holds the shadcn/ui components
lib/          particles.ts (home page animation), utils.ts (shadcn's cn, used by components/ui), random.ts, repeat.ts
content/      layout.json: menu, theme options, contact, social links, copyright
.storybook/   Storybook config: preview.ts loads app/globals.css and app/fonts.ts, toolbar toggles the dark class
```

Things that take more than one file to see:

- **The site is a static export** (`output: 'export'`, `trailingSlash: true`, optional `NEXT_PUBLIC_BASE_PATH`). Route handlers, server actions, middleware and the default image optimizer don't work.
- **Server components by default.** Only `theme-provider`, `theme-selector`, `particle-canvas` and the generated `components/ui/dropdown-menu` are client components.
- **Layout and content are data-driven.** `app/layout.tsx` builds the header, navigation, theme selector and footer from `content/layout.json`; pages render only their main content.
- **Styling** is Tailwind 4, configured in `app/globals.css`. Colours are semantic tokens only (`background`, `foreground`, `primary`/`primary-foreground`, `secondary`/`secondary-foreground`, `accent`, `highlight`/`highlight-foreground` and `muted-foreground`), defined in `:root` and `.dark`; there are no raw colour scales. Fonts are `sans` (Lausanne) and `mono` (NB International Pro Mono), defined with `next/font/local` in `app/fonts.ts` and applied to `<html>` in `app/layout.tsx`.
- **shadcn/ui** components live in `components/ui/` and are edited freely to match the site's look. `components.json` was written by hand (no `shadcn init`), so add new components with `npx shadcn@latest add <name>`, then install any import it didn't (`radix-ui`, `lucide-react`) and restyle it with the tokens.
- **Theme handling is `next-themes`** (`attribute="class"`, system by default, choice stored in `localStorage`). Its inline script sets the class before the first paint. Client components that show the theme render "system" until hydrated (`useSyncExternalStore`), so the static HTML and the first client render agree.
- **Icons are Lucide** (`lucide-react`). The theme options' `icon` values in `content/layout.json` are Lucide icon names, mapped in `components/theme-selector.tsx`.
- **Storybook** covers the shadcn/ui components and the theme selector, with stories next to each (`*.stories.tsx`). Its preview adds the fonts' variable classes to `<html>`, because the theme's font tokens resolve there; wrapping a story in them isn't enough. A story that needs `next-themes` must give its provider `attribute="data-theme"` and its own `storageKey`, so it doesn't fight the toolbar over the `dark` class.
- **The `@/*` alias** resolves from the repository root, in Next.js through `tsconfig.json` and in Vitest through `vitest.config.ts`.

Component tests are Vitest with Testing Library and user-event in jsdom (`vitest.config.ts`, `vitest.setup.ts`). `vitest.setup.ts` stubs `ResizeObserver`, which jsdom lacks and Radix needs.

## CI and deployment

All workflows install through the composite action `.github/actions/setup-node` (Node from `.nvmrc`, `npm ci`). Actions are pinned by commit SHA where Dependabot maintains them.

- **Continuous Integration** (push to `main`, pull requests): lint, typecheck, test, build, build Storybook.
- **Preview Environment** (pull requests to `main`): builds and syncs `out/` to a public S3 website bucket `preview-pr-<number>-vanesterik`, and caches the preview URL. Closing the pull request deletes the bucket.
- **Web Performance Audit** waits for the "Deploy Preview Environment" check, runs Lighthouse on `/`, `/about/`, `/projects/` and `/posts/`, and keeps a single score comment on the pull request up to date. A new top-level page should be added to its URL list.
- **Production Environment** (tag `v*.*.*`): builds and syncs `out/` to the production S3 bucket.

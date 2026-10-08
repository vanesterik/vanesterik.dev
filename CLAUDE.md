# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The global `~/.claude/CLAUDE.md` (development workflow, branching, pull requests, issue tracking, documentation conventions) applies here as well. This file holds only what is specific to this project, and wins where the two disagree.

## Project

Showcase website of [@vanesterik](https://github.com/vanesterik): a statically exported Next.js site, hosted on AWS S3. The GitHub repository is `vanesterik/vanesterik.dev`. User stories and epics go on the project board [vanesterik.dev](https://github.com/users/vanesterik/projects/4) (user project 4: `gh project item-add 4 --owner vanesterik --url <issue-url>`).

## Commands

A pnpm workspace (`pnpm@10`, Node >= 20). Run from the repository root unless noted.

```bash
pnpm install                      # install all workspaces
pnpm --filter next dev            # Next.js dev server (apps/next)
pnpm --filter @vanesterik/ui dev  # Ladle story browser for the UI package
pnpm build                        # build every workspace that has a build script (static export to apps/next/out)
pnpm lint                         # ESLint per workspace
pnpm typecheck                    # tsc --noEmit per workspace
pnpm test                         # Vitest workspace (watch mode locally, single run under CI)
pnpm coverage                     # Vitest with v8 coverage
```

Run a single unit test file or filter by test name:

```bash
pnpm vitest run apps/next/src/components/Header/Header.test.tsx
pnpm vitest run -t "renders"
```

End-to-end tests are Playwright in `packages/e2e` (no package scripts; call Playwright directly):

```bash
pnpm --filter e2e exec playwright install --with-deps
pnpm --filter e2e exec playwright test
```

`packages/e2e/tests/example.spec.ts` is still the Playwright scaffold that targets playwright.dev, and `baseURL` in `playwright.config.ts` is commented out. The e2e workflow reads the preview URL into a step output but doesn't pass it to Playwright yet.

## Git hooks and commit messages

Husky runs on every commit:

- **pre-commit**: `pnpm typecheck` across all workspaces, then lint-staged (ESLint with `--max-warnings 0` and Prettier on staged TS/TSX; Prettier on JS, JSON, Markdown, YAML).
- **commit-msg**: commitlint with `@commitlint/config-conventional`. The subject must not be sentence case, start case or pascal case, so write `feat: add posts page`, not `feat: Add posts page`.

Releases use `standard-version` (`pnpm release`), which bumps the version, updates `CHANGELOG.md` and creates a `v*.*.*` tag. Pushing that tag deploys production, so releasing is Koen's call.

Prettier and ESLint configs come from Koen's own GitHub-hosted packages (`github:vanesterik/prettier-config`, `github:vanesterik/eslint-config-custom`), not from files in this repository.

## Architecture

```
apps/next          Next.js 13 site (pages router), the only deployable app
packages/ui        Tailwind style functions built with class-variance-authority, plus Ladle stories
packages/config    shared Tailwind theme, PostCSS config and tsconfig bases
packages/data      site content as JSON (layout.json: menu, theme options, contact, social links, copyright)
packages/fonts     self-hosted woff2 fonts and the @font-face CSS, including an icon font
packages/utils     small shared helpers with unit tests
packages/e2e       Playwright tests run against the preview deployment
```

Things that take more than one file to see:

- **`@vanesterik/ui` exports style functions, not React components.** Each `lib/*.ts` is a `cva(...)` call returning a class string (`button({ intent: 'ghost' })`, `stack({ direction: 'row' })`). React components live in `apps/next/src/components/<Name>/` and apply those functions as `className`. Put new visual styling in a `cva` function in `packages/ui`, with a story in `packages/ui/stories/`, rather than as inline Tailwind classes in the app.
- **Tailwind has to see the UI package's classes.** `apps/next/tailwind.config.js` extends the shared theme in `packages/config/tailwind` and adds `packages/ui/**/*.ts` to `content`. The theme replaces Tailwind's palette entirely: only `black`, `white`, `primary` (stone) and `secondary` (yellow) exist, and the font families are `sans` (Lausanne), `mono` (NB International Pro Mono) and `icon`.
- **Workspace packages ship untranspiled TypeScript.** `apps/next/next.config.js` lists them in `next-transpile-modules`. A new package that the app imports has to be added there.
- **The site is a static export** (`output: 'export'`, `trailingSlash: true`, optional `NEXT_PUBLIC_BASE_PATH`). Server-side features such as API routes, `getServerSideProps`, middleware and the default image optimizer don't work.
- **Layout and content are data-driven.** `apps/next/src/pages/_app.tsx` builds the header, navigation, theme selector and footer from `packages/data/layout.json`. Pages under `src/pages/` render only their main content.
- **Dark mode is class-based.** `ThemeProvider` resolves light, dark or system preference and toggles `dark` on `<html>`; Tailwind uses `darkMode: 'class'`. Ladle's global provider (`packages/ui/.ladle/components.tsx`) toggles the same class so stories show both themes.
- **Icons are glyphs of the icon font**, mapped in `packages/ui/lib/icon.ts` through `before:content-['<char>']`. Adding an icon means adding the glyph to `packages/fonts/files/icomoon.woff2` and a variant to `icon`.

Component tests are Vitest with Testing Library in jsdom (`apps/next/vitest.config.ts`), placed next to the component as `<Name>.test.tsx`. `packages/ui` has no tests.

## CI and deployment

All workflows install through the composite action `.github/actions/setup-node`. Actions are pinned by commit SHA where Dependabot maintains them.

- **Continuous Integration** (push to `main`, pull requests): lint, typecheck, unit tests, build.
- **Preview Environment** (pull requests to `main`): builds `apps/next`, syncs `out/` to a public S3 website bucket `preview-pr-<number>-vanesterik`, and caches the preview URL for the jobs below. Closing the pull request deletes the bucket.
- **End-to-End Tests** and **Web Performance Audit** wait for the "Deploy Preview Environment" check. The audit runs Lighthouse on `/`, `/about/`, `/projects/` and `/posts/` and keeps a single score comment on the pull request up to date. A new top-level page should be added to its URL list.
- **Production Environment** (tag `v*.*.*`): builds and syncs `apps/next/out` to the production S3 bucket.

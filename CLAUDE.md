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
npx vitest run src/components/link-list.test.tsx
npx vitest run -t "applies the dark theme"
```

There is no `start` script: `next start` doesn't serve a static export. Use `npx serve out` to look at a build.

## Git hooks and commit messages

Husky runs on every commit:

- **pre-commit**: `npm run typecheck`, then lint-staged (`biome check --write` on staged files).
- **commit-msg**: commitlint with `@commitlint/config-conventional`. The subject must not be sentence case, start case or pascal case, so write `feat: add posts page`, not `feat: Add posts page`.

## Releasing

A release deploys the site and Storybook, so it's Koen's call: only release when he asks. Releases use `commit-and-tag-version`, which bumps the version in `package.json` and `package-lock.json` and adds a section to `CHANGELOG.md`. Nothing is pushed to `main` directly. The release commit goes through a pull request, and only the tag is pushed:

1. **Preview** on an up-to-date `main`: `npx commit-and-tag-version --dry-run` shows the next version and its changelog section.
2. **Commit the release on a branch, without tagging:**

   ```bash
   git checkout -b release/<version>
   npx commit-and-tag-version --skip.tag --releaseCommitMessageFormat "chore(release): {{currentTag}}"
   ```

   When Claude makes the commit, add the `Co-Authored-By` line to the format.
3. **Open a pull request** titled `chore(release): <version>`, wait for CI, and let Koen merge it.
4. **Tag the merged commit and push only the tag:**

   ```bash
   git checkout main && git pull --ff-only
   git log -1 --format=%h --grep='^chore(release): <version>$'
   git tag -a v<version> <sha> -m "chore(release): <version>"
   git push origin v<version>
   ```

   Tag the commit on `main`, not the branch's: rebase merging gives it a new SHA.
5. **Watch the deploy** (`gh run watch` on the `deploy.yml` run for the tag), then check https://www.vanesterik.dev/ and the Storybook URL.

`feat:` commits make a minor release and `fix:` commits a patch. Other types (`docs:`, `refactor:`, `chore:`) still make a patch release, but they aren't listed in the changelog. `.versionrc.json` sets the changelog's GitHub links explicitly, because the tool reads the repository name from the remote as `vanesterik` (it drops the `.dev`).

## Architecture

```
src/app/          App Router: layout.tsx (shell, fonts, theme provider), pages, not-found, globals.css, fonts/
src/components/   site components, tests next to each (*.test.tsx); ui/ holds the shadcn/ui components
src/lib/          posts.ts (Markdown posts: load, validate, render), particles.ts (home page animation), utils.ts (cn re-export, only for components.json), random.ts, repeat.ts
content/          layout.json (menu, theme options, contact, social links, copyright), posts/*.md
.storybook/       Storybook config: preview.ts loads src/app/globals.css and src/app/fonts.ts, toolbar toggles the dark class
```

Things that take more than one file to see:

- **The site is a static export** (`output: 'export'`, `trailingSlash: true`, optional `NEXT_PUBLIC_BASE_PATH`). Route handlers, server actions, middleware and the default image optimizer don't work.
- **Server components by default.** Only `theme-provider`, `theme-selector`, `particle-canvas` and the generated `src/components/ui/dropdown-menu` are client components.
- **Layout and content are data-driven.** `src/app/layout.tsx` builds the header, navigation, theme selector and footer from `content/layout.json`; pages render only their main content.
- **On screens from `md` (768px) up, the header and footer stay in view:** they're `sticky` (top and bottom) with no background, so the page content scrolls behind them. The column in `src/app/layout.tsx` is `min-h-screen`, and `main` grows (`flex-auto`) to keep the footer at the bottom. The home page's particle canvas is `fixed` to the whole viewport and the header and footer (`z-10`) overlay it, at every screen size. They pass clicks through (`pointer-events-none`) except on their own links and buttons, and `<html>` has scroll padding (`md:scroll-pt-24 md:scroll-pb-52`) so focused or linked content stops clear of them; change those if the header or footer grows. Below `md` the header and footer scroll with the page.
- **Posts** are Markdown files in `content/posts/<slug>.md` with required front matter (`title`, `date` as `YYYY-MM-DD`, `description`) and no `# H1`; the file name is the URL. `src/lib/posts.ts` reads and renders them at build time (gray-matter, remark/rehype, Shiki with GitHub light and dark as CSS variables); a broken post fails the build with its file name. `/posts/` lists them newest first and `/posts/<slug>/` renders one in a 640px column with Tailwind Typography, whose colours are mapped onto the tokens in `src/app/globals.css`. `getPost` returns the rendered HTML tree, and `src/components/post-content.tsx` turns it into React elements (`hast-util-to-jsx-runtime`), mapping every `<pre>` to `src/components/code-block.tsx`: Shiki's block plus a copy button that appears on hover or focus (always on touch devices) and isn't rendered without the Clipboard API. Adding a post needs no code.
- **Styling** is Tailwind 4, configured in `src/app/globals.css`. Colours are semantic tokens only (`background`, `foreground`, `primary`/`primary-foreground`, `secondary`/`secondary-foreground`, `accent`, `highlight`/`highlight-foreground` and `muted-foreground`), defined in `:root` and `.dark`; there are no raw colour scales. Fonts are `sans` (Lausanne) and `mono` (NB International Pro Mono), defined with `next/font/local` in `src/app/fonts.ts` and applied to `<html>` in `src/app/layout.tsx`.
- **shadcn/ui** components live in `src/components/ui/` and are edited freely to match the site's look. `components.json` was written by hand (no `shadcn init`). Components import `cn` from the `cn` package directly, as the CLI generates them; `src/lib/utils.ts` only exists because `components.json` names it. Add new components with `npx shadcn@latest add <name>`, then install any import it didn't (`radix-ui`, `lucide-react`) and restyle it with the tokens.
- **Theme handling is `next-themes`** (`attribute="class"`, system by default, choice stored in `localStorage`). Its inline script sets the class before the first paint. Client components that show the theme render "system" until hydrated (`useSyncExternalStore`), so the static HTML and the first client render agree. `src/components/theme-provider.tsx` sets those settings itself as defaults, and the layout renders `<ThemeProvider>` without props: a server component can't receive a plain value exported from a `'use client'` module (it arrives as a client reference, so its props silently vanish).
- **Icons are Lucide** (`lucide-react`). The theme options' `icon` values in `content/layout.json` are Lucide icon names, mapped in `src/components/theme-selector.tsx`.
- **Storybook** covers the shadcn/ui components and the theme selector, with stories next to each (`*.stories.tsx`). Its preview adds the fonts' variable classes to `<html>`, because the theme's font tokens resolve there; wrapping a story in them isn't enough. A story that needs `next-themes` must give its provider `attribute="data-theme"` and its own `storageKey`, so it doesn't fight the toolbar over the `dark` class.
- **All code lives in `src/`;** the root holds configuration, `content/`, `public/`, `docs/` and build output. **The `@/*` alias** resolves to `src/`, except `@/content/*`, which resolves to the root `content/` folder. Both are set in `tsconfig.json` (Next.js, Storybook) and `vitest.config.ts` (Vitest).

Component tests are Vitest with Testing Library and user-event in jsdom (`vitest.config.ts`, `vitest.setup.ts`). `vitest.setup.ts` stubs `ResizeObserver`, which jsdom lacks and Radix needs.

## CI and deployment

Two workflows. Actions are pinned by commit SHA with a version comment, which Dependabot updates.

- **`ci.yml`** (push to `main`, pull requests, and called by `deploy.yml`): lint, typecheck, test, build. Storybook is built only when it's deployed. A newer push cancels an older run on the same pull request.
- **`deploy.yml`** (tag `v*.*.*`): runs `ci.yml`, then in parallel syncs `out/` to the production S3 bucket (access-key secrets `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`, `AWS_S3_BUCKET_NAME`) and publishes Storybook to GitHub Pages at https://vanesterik.github.io/vanesterik.dev/. Deploys are never cancelled midway.

Pushing a release tag (see "Releasing" above) is the only way to deploy. GitHub Pages must use the source "GitHub Actions", and its `github-pages` environment must allow `v*.*.*` tags.

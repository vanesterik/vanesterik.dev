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

## Recordings

A web project's preview video, or a cli project's terminal recording, is a recorded flow, made by a script in `scripts/recordings/<slug>.ts`:

```bash
npm run record -- <slug>            # a web flow: public/projects/<slug>.mp4 and its first frame, <slug>.jpg; a terminal flow: <slug>.cast
HEADED=1 npm run record -- <slug>   # in a visible window, for a site that refuses a headless browser
```

`scripts/recordings/record.ts` runs the flow in Playwright's Chromium at 1440 × 900, records it, and has ffmpeg trim it to the flow and write an H.264 MP4 and its first frame (the screenshot and poster). A flow is a `Flow`: the page it starts on, how long to wait for it (`waitUntil`: the network going quiet by default, or `load` for a site that never goes quiet), an optional `check` before the browser opens (such as a local app that must be running), a `prepare` that runs before the video starts (refusing a cookie banner, hiding overlays, so the first frame is clean), and the steps. What a flow needs before it runs is written in its own script. A flow can also be a terminal flow (`TerminalFlow`): a zsh plugin and the commands typed after it. `record.ts` records it with asciinema at 80 × 16 (`src/lib/terminal-size.ts`, which the player shares) into `public/projects/<slug>.cast`, in a throwaway zsh: its own `.zshrc` (`ZDOTDIR`: completion, zap, a plain `$ ` prompt) and zap folder (`XDG_DATA_HOME`), with the user's `HOME`, `PATH` and git config. `expect` types each step once the prompt is back, and a step can wait for something else (a pager), pause and press a key. Waits over 3 seconds are cut. The cast is written outside the repository and copied in, so record from a clean working tree when a step shows it. Web flows need ffmpeg (`mise use -g ffmpeg`) and Chromium (`npx playwright install chromium`); terminal flows need asciinema (`brew install asciinema`) and `expect` (part of macOS). Recordings are made on a Mac and committed after looking at them, never in CI: live sites change, and some refuse a headless browser. In a visible window, don't touch it while the flow runs. A first page that doesn't open fails in one line: refused (a dropped connection), not finished loading, or Chromium's own error.

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
src/lib/          posts.ts (Markdown posts: load, validate, render; Node only), rehype-mermaid.ts (draws a post's Mermaid diagrams), post-date.ts (formatPostDate, safe in the browser), contact-links.ts, projects.ts (projects: validated, newest first; safe in the browser), project-files.ts (fails the build on a preview file missing from public/; Node only), particles.ts (home page animation), utils.ts (cn re-export, only for components.json), random.ts, repeat.ts
content/          layout.json (menu, theme options, contact, social links, tagline, copyright), about.json (about page), projects.json (projects page), posts/*.md
.storybook/       Storybook config: preview.ts loads src/app/globals.css and src/app/fonts.ts, toolbar toggles the dark class
src/stories/      Storybook's design token pages (colors, typography) and tokens.ts, the token list they show
```

Things that take more than one file to see:

- **The site is a static export** (`output: 'export'`, `trailingSlash: true`, optional `NEXT_PUBLIC_BASE_PATH`). Route handlers, server actions, middleware and the default image optimizer don't work.
- **Server components by default.** Only `theme-provider`, `theme-selector`, `particle-canvas`, `nav-link`, `mobile-menu`, `project-index`, `project-status`, `preview-video`, `terminal-recording` and the generated `src/components/ui/dropdown-menu`, `src/components/ui/accordion` and `src/components/ui/tooltip` are client components.
- **Layout and content are data-driven.** `src/app/layout.tsx` builds the header, navigation, theme selector and footer from `content/layout.json`; pages render only their main content. The about page (`src/app/about/page.tsx`) renders `content/about.json` in `AboutSection`s, and takes its tagline and its Email, LinkedIn and GitHub links from `content/layout.json` (`src/lib/contact-links.ts`), so they live in one place.
- **On screens from `md` (768px) up, the header and footer stay in view:** they're `sticky` (top and bottom) with no background, so the page content scrolls behind them. The column in `src/app/layout.tsx` is `min-h-screen`, and `main` grows (`flex-auto`) to keep the footer at the bottom. The home page's particle canvas is `fixed` to the whole viewport and the header and footer (`z-10`) overlay it, at every screen size. They pass clicks through (`pointer-events-none`) except on their own links and buttons, and `<html>` has scroll padding (`md:scroll-pt-24 md:scroll-pb-52`) so focused or linked content stops clear of them; change those if the header or footer grows. Below `md` the header and footer scroll with the page.
- **Posts** are Markdown files in `content/posts/<slug>.md` with required front matter (`title`, `date` as `YYYY-MM-DD`, `description`) and no `# H1`; the file name is the URL. `src/lib/posts.ts` reads and renders them at build time (gray-matter, remark/rehype, Shiki with GitHub light and dark as CSS variables); a broken post fails the build with its file name. `/posts/` lists them newest first and `/posts/<slug>/` renders one in a 640px column with Tailwind Typography, whose colors are mapped onto the tokens in `src/app/globals.css`. `getPost` returns the rendered HTML tree, and `src/components/post-content.tsx` turns it into React elements (`hast-util-to-jsx-runtime`), mapping every `<pre>` to `src/components/code-block.tsx`: Shiki's block plus a copy button that appears on hover or focus (always on touch devices) and isn't rendered without the Clipboard API. A ` ```mermaid ` fence becomes an inline SVG at build time (`src/lib/rehype-mermaid.ts`, with `beautiful-mermaid`: pure JavaScript, no browser in the build or the page), in a `<figure class="mermaid">`. It's colored with the tokens as CSS variables, so a theme switch recolors it, and set in Lausanne; it keeps its drawn size and scrolls sideways inside its figure on narrow screens. Each diagram needs an `accTitle:` line (and may have `accDescr:`), which become the SVG's `<title>` and `<desc>`; its ids get a `mermaid-<n>-` prefix. Only flowchart, state, sequence, class, ER and XY chart diagrams work: another type, or a missing `accTitle`, fails the build with the post's file name, but a malformed line inside a diagram is dropped silently. The renderer drops straight double quotes from labels, so use curly ones. Adding a post, with or without diagrams, needs no code.
- **Projects** are `content/projects.json`, checked by `getProjects()` in `src/lib/projects.ts`; a missing or unknown value fails the build, named by the project's slug. `/projects/` renders them in a centred 640px column as a minimal `ls -l` style table without borders or a header (`ProjectIndex`, a Radix Accordion with one row open at a time): name, type, year and a status dot whose label shows in a tooltip, in the header and footer's `text-xs` uppercase mono. A row opens to its preview and `ProjectDetails`. The preview is a screenshot from `public/projects/`, in a `BrowserFrame` or, with `preview.frame: "terminal"`, in a `TerminalFrame` (for a terminal app); or a terminal session as text in a `TerminalFrame`. The types are `web`, `cli` (zsh plugins too), `lib` and `mcp` (a Model Context Protocol server); they set the primary link's label. Status dots are green (live), red (wip) and grey (archived). The terminal frame has the `dark` class, so it uses the dark theme's tokens in both themes. A web project's preview can also have a video, `preview.video` (an MP4 in the browser frame, with its `image` as the poster), and any preview a `preview.note`, a line in muted grey under it. The video (`PreviewVideo`) plays muted, looping and inline, and starts only after hydration (the reduced-motion preference is only known in the browser, through `useSyncExternalStore`); under `prefers-reduced-motion` it doesn't start and shows controls, and a refused `play()` keeps the poster. It only exists while its row is open: the Accordion unmounts a closed row's content. Every `image` and `video` must be in `public/`: `checkProjectFiles` (`src/lib/project-files.ts`, Node only) fails the build otherwise, named by the slug, when the projects pages build. A cli project's preview can instead be a recording, `preview.recording`: an asciinema cast (80 × 16) that `TerminalRecording` plays looping in the terminal frame, with a "loop" label by its title. A box of that size holds the space until `asciinema-player` has loaded, so opening a row shifts nothing; the player is imported only when its row opens, takes the frame's colors from the tokens (`.asciinema-player-theme-site` in `globals.css`), and under `prefers-reduced-motion` shows the last frame and waits to be started. A preview has a recording or a scripted session, not both, and a web project has neither. `/projects/<slug>/` (`src/app/projects/[slug]/page.tsx`, prerendered once per slug, `dynamicParams = false`) is the same page (`src/app/projects/projects-page.tsx`) with that row open, titled `Van Esterik · <name>` (`projectTitle` in `src/lib/projects.ts`, also set when a row opens) with `/projects/` as its canonical URL. `ProjectIndex` takes the open row from `usePathname()`, so the static HTML, Back, Forward and reload all show the row the address names; opening or closing a row replaces the address with `history.replaceState` (no history entry), but only on the projects route, so Storybook's preview keeps its URL. A row that opens, by a click or a deep link, snaps to the top of the page without animating (`scrollIntoView`, clear of the sticky header through the scroll padding). J and K open the next and the previous project, as a click does, from the first or the last with none open; not with Cmd, Ctrl or Alt held, or in a text field.
- **The navigation marks the current page,** or the section above it (Projects on `/projects/<slug>/`, Posts on `/posts/<slug>/`; home only on `/`): `NavLink` (a client component, `usePathname`, ignoring the trailing slash, through `isCurrentPath`) gives it the `default` button style (`primary`: black in light, white in dark) and `aria-current="page"`; `MobileMenu` marks its current item the same way.
- **Styling** is Tailwind 4, configured in `src/app/globals.css`. Colors are semantic tokens only (`background`, `foreground`, `primary`/`primary-foreground`, `secondary`/`secondary-foreground`, `accent`, `buffer` (the ring around a dragged particle), `highlight`/`highlight-foreground`, `muted-foreground`, and `info`, `warning`, `success` and `danger` (from Shiki's GitHub light and dark themes, which code blocks use)), defined in `:root` and `.dark`; there are no raw color scales. Fonts are `sans` (Lausanne) and `mono` (NB International Pro Mono), defined with `next/font/local` in `src/app/fonts.ts` and applied to `<html>` in `src/app/layout.tsx`.
- **shadcn/ui** components live in `src/components/ui/` and are edited freely to match the site's look. `components.json` was written by hand (no `shadcn init`). Components import `cn` from the `cn` package directly, as the CLI generates them; `src/lib/utils.ts` only exists because `components.json` names it. Add new components with `npx shadcn@latest add <name>`, then install any import it didn't (`radix-ui`, `lucide-react`) and restyle it with the tokens.
- **Theme handling is `next-themes`** (`attribute="class"`, system by default, choice stored in `localStorage`). Its inline script sets the class before the first paint. Client components that show the theme render "system" until hydrated (`useSyncExternalStore`), so the static HTML and the first client render agree. The particle canvas doesn't read the theme: it draws in its canvas's computed `color` (`text-foreground`) and `--buffer` every frame, so a theme change recolors the running animation instead of restarting it. `src/components/theme-provider.tsx` sets those settings itself as defaults, and the layout renders `<ThemeProvider>` without props: a server component can't receive a plain value exported from a `'use client'` module (it arrives as a client reference, so its props silently vanish).
- **Icons are Lucide** (`lucide-react`). The theme options' `icon` values in `content/layout.json` are Lucide icon names, mapped in `src/components/theme-selector.tsx`.
- **Storybook** covers every reusable component (not Header, Footer, PostContent, ParticleCanvas or ThemeProvider), with stories next to each (`*.stories.tsx`), using the real content from `content/` where it exists. Its "Design tokens" pages in `src/stories/` read the colors and text sizes from the running CSS, so they follow `globals.css` and the toolbar's theme; a test fails when a color token is added to or removed from `globals.css` without updating `src/stories/tokens.ts`. Stories render in the browser, so a component they show can't import Node-only code such as `src/lib/posts.ts`. Its preview adds the fonts' variable classes to `<html>`, because the theme's font tokens resolve there; wrapping a story in them isn't enough. A story that needs `next-themes` must give its provider `attribute="data-theme"` and its own `storageKey`, so it doesn't fight the toolbar over the `dark` class.
- **The root layout sets `metadataBase`** (`https://www.vanesterik.dev`), so a page's canonical URL can be given as a path.
- **All code lives in `src/`;** the root holds configuration, `content/`, `public/`, `docs/` and build output. **The `@/*` alias** resolves to `src/`, except `@/content/*`, which resolves to the root `content/` folder. Both are set in `tsconfig.json` (Next.js, Storybook) and `vitest.config.mts` (Vitest).

Component tests are Vitest with Testing Library and user-event in jsdom (`vitest.config.mts`, `vitest.setup.ts`). `vitest.setup.ts` stubs `ResizeObserver`, which jsdom lacks and Radix needs.

## CI and deployment

Two workflows. Actions are pinned by commit SHA with a version comment, which Dependabot updates.

- **`ci.yml`** (push to `main`, pull requests, and called by `deploy.yml`): lint, typecheck, test, build. A push or pull request that changes only Markdown skips it, unless it touches `content/posts/` or `src/` (posts and their test fixtures, which the build and tests check); a release still runs it in full. Storybook is built only when it's deployed. A newer push cancels an older run on the same pull request.
- **`deploy.yml`** (tag `v*.*.*`): runs `ci.yml`, then in parallel syncs `out/` to the production S3 bucket (access-key secrets `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`, `AWS_S3_BUCKET_NAME`) and publishes Storybook to GitHub Pages at https://vanesterik.github.io/vanesterik.dev/. Storybook is built with `NEXT_PUBLIC_BASE_PATH=/vanesterik.dev`, because a plain `<img>` of a file in `public/` (such as `BrowserFrame`'s screenshot) needs that prefix there; Next's own links and assets add the base path by themselves. Deploys are never cancelled midway.

Pushing a release tag (see "Releasing" above) is the only way to deploy. GitHub Pages must use the source "GitHub Actions", and its `github-pages` environment must allow `v*.*.*` tags.

# Repository overhaul: a single npm Next.js app

Status: approved in conversation on 2026-10-08, pending review of this document.

## Purpose

The repository is a pnpm monorepo (`apps/next` plus six workspace packages) built for study purposes. The structure, and especially the home-made component library `@vanesterik/ui`, is more machinery than a personal showcase site needs. The overhaul turns it into a default Next.js website: one npm package on a current stack, with shadcn/ui providing the few interactive components.

Success means the live site looks and behaves as it does today, and the repository reads as a plain Next.js project to anyone who knows Next.js.

## Scope

In scope: repository structure, framework and tooling upgrades, replacing `@vanesterik/ui` with shadcn/ui, replacing Ladle with Storybook, and adapting CI and deployment to all of that.

Out of scope: visual redesign, new content (about, projects and posts stay "coming soon"), changing hosting (static export to AWS S3 stays), production domain and DNS.

Two visible changes are intended:

1. The theme selector's icons become Lucide icons instead of glyphs from the custom icon font.
2. The page no longer flashes the wrong theme on first load.

## Decisions

| Topic | Decision |
|---|---|
| Package manager | npm, single `package.json`, `package-lock.json` committed, npm version pinned in `packageManager` |
| Node | 24 LTS, pinned in `.nvmrc` and used by CI |
| Framework | Next.js 16 with the App Router (replacing the Pages Router), React 19 |
| Output | Static export: `output: 'export'`, `trailingSlash: true`, optional `NEXT_PUBLIC_BASE_PATH` |
| Styling | Tailwind CSS 4, configured in CSS (`@theme`), no JavaScript config |
| Components | shadcn/ui (`Button`, `DropdownMenu`) themed through CSS variables; layout as plain Tailwind classes |
| Icons | `lucide-react`; the icomoon icon font is removed |
| Theme | `next-themes` replaces the custom `ThemeProvider` |
| Fonts | `next/font/local` for Lausanne 400/700 and NB International Pro Mono |
| Lint and format | Biome replaces ESLint and Prettier |
| Unit tests | Vitest with Testing Library in jsdom |
| End-to-end tests | Dropped: Playwright, `packages/e2e` and `e2e-tests.yml` are removed |
| Component catalogue | Storybook replaces Ladle |
| Commit hooks | Husky 9, lint-staged, commitlint (conventional commits, existing subject-case rule) |
| Releases | `commit-and-tag-version` replaces the deprecated `standard-version`; `v*.*.*` tags still deploy production |
| Lighthouse audit | Kept, against the preview deployment |

Latest versions on npm on 2026-10-08: `next` 16.4.0, `react` 19.3.0, `tailwindcss` 4.3.3, `@biomejs/biome` 2.5.15, `vitest` 5.0.3, `@testing-library/react` 16.3.3, `storybook` and `@storybook/nextjs-vite` 10.6.1, `next-themes` 0.4.6, `lucide-react` 1.53.0, `commit-and-tag-version` 13.2.1, `husky` 9.1.7. TypeScript's latest is 7.0.2 (the native compiler). The project uses the newest TypeScript version Next.js 16 officially supports, which the story 1 plan verifies rather than assumes.

## Target structure

```
app/
  layout.tsx            html, body, fonts, theme provider, Header, Footer
  page.tsx              home page: particle canvas (client component)
  about/page.tsx        "coming soon"
  projects/page.tsx     "coming soon"
  posts/page.tsx        "coming soon"
  not-found.tsx         replaces pages/404.tsx
  globals.css           Tailwind import, theme tokens (:root and .dark)
  fonts/                .woff2 files for next/font/local
components/
  header.tsx, footer.tsx, navigation.tsx, link-list.tsx, prompt.tsx,
  coming-soon.tsx, theme-selector.tsx, with *.test.tsx next to each
  ui/                   shadcn components with *.stories.tsx next to each
lib/
  particles.ts          formerly packages/ui/lib/game.ts
  random.ts, repeat.ts  formerly packages/utils, with tests
  utils.ts              shadcn's cn()
content/
  layout.json           formerly packages/data/layout.json, same shape
.storybook/
```

Constraints that hold throughout:

- **Nothing may need a server.** No route handlers, server actions, middleware or the default image optimizer.
- **Server components by default.** Only the particle canvas, the theme selector and the theme provider are client components.
- **`content/layout.json` keeps its structure.** The one exception is that story 2 changes the theme options' `icon` values to Lucide icon names.

## Delivery

One epic issue with three story issues, all on the vanesterik.dev board (GitHub user project 4). Each story ships as one pull request with one commit per plan task, and leaves a working site. This spec is the first commit of story 1's pull request. Each story's plan is written in `docs/plans/` and approved just before that story starts.

### Story 1: flatten to a single npm Next.js app

Goal: the same site, built from one npm package on the current stack.

- **Move the workspaces to the root.** `apps/next/src` becomes the root `app/`, `components/` and `lib/`. `packages/data` becomes `content/layout.json`, and `packages/utils` becomes `lib/random.ts` and `lib/repeat.ts`.
- **Delete what's left of the monorepo:** `packages/config`, `packages/e2e`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `vitest.workspace.ts`, `next-transpile-modules` and `.github/workflows/e2e-tests.yml`.
- **Move the `@vanesterik/ui` style functions unchanged** to `lib/styles/*.ts`, so every component keeps its classes until story 2. The particle code moves to `lib/particles.ts`. Ladle and its stories are removed.
- **Migrate from the Pages Router to the App Router.**
  - `_app.tsx` becomes `app/layout.tsx`.
  - `404.tsx` becomes `app/not-found.tsx`.
  - Each `pages/*/index.tsx` becomes a `page.tsx`.
  - The home page's particle canvas becomes a client component.
- **Migrate Tailwind 3 to 4.**
  - The theme moves into `@theme` in `app/globals.css`.
  - `--color-*: initial;` keeps the restricted palette: black, white, `primary` (stone) and `secondary` (yellow).
  - Dark mode uses `@custom-variant dark (&:where(.dark, .dark *))`.
  - PostCSS uses `@tailwindcss/postcss`, and `autoprefixer` is removed.
- **Load the three text fonts through `next/font/local`** and expose them as the `sans` and `mono` font families. The icon font stays as plain CSS for now.
- **Keep the custom `ThemeProvider` and Headless UI for now,** upgraded to React 19 and Headless UI 2.
- **Replace the tooling:**
  - **Linting and formatting:** Biome replaces ESLint and Prettier. `biome.json` uses the recommended rules and formatting that matches the current style: two-space indent, single quotes, no semicolons, trailing commas.
  - **Commit hooks:** Husky 9, with `"prepare": "husky"`. Pre-commit runs `tsc --noEmit`, then lint-staged with `biome check --write`. commit-msg runs commitlint.
  - **Releases:** `commit-and-tag-version` replaces `standard-version`.
- **npm scripts:** `dev`, `build`, `start`, `lint` (`biome check`), `format`, `typecheck`, `test` (single run), `test:watch`, `coverage` and `release`.
- **CI and deployment:**
  - **Setup action:** reads Node from `.nvmrc` and runs `npm ci`.
  - **Continuous Integration:** runs lint, typecheck, test and build.
  - **Preview and production:** run `npm run build` and sync `out/`.
  - **Lighthouse audit:** unchanged.
  - **Dependabot:** switches to the `npm` ecosystem.
- **Rewrite `README.md` and `CLAUDE.md`** for the new structure.

Testing: the existing component and helper tests move and are adapted. The `Prompt` snapshot is regenerated only if the class order changes. The particle module keeps its behaviour and gets no new tests in this story.

Done when:

- `npm ci`, `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass locally and in CI.
- `out/` contains `index.html`, `about/`, `projects/`, `posts/` and `404.html`.
- The preview deployment matches production side by side, in light and dark.
- Lighthouse scores are not lower than the current ones.

### Story 2: replace the style functions with shadcn/ui

Goal: the interactive components come from shadcn/ui, and the home-made style functions are gone.

Only `Button` and `DropdownMenu` are needed. `card` is used only in a Ladle story, so no `Card` is added.

The theme tokens in `app/globals.css` map the existing palette onto shadcn's token names:

| Token | Light | Dark | Replaces |
|---|---|---|---|
| `background` / `foreground` | white / black | black / white | `bg-white dark:bg-black` |
| `primary` / `primary-foreground` | black / white | white / black | `primary` button intent |
| `secondary` / `secondary-foreground` | stone-200 at 80% / black | stone-800 at 80% / white | `secondary` button intent, dropdown items |
| `accent` | stone-200 | stone-800 | hover backgrounds |
| `highlight` / `highlight-foreground` (custom) | yellow-500 / black | yellow-500 / black | active and pressed state, link hover colour |
| `muted-foreground` | stone-300 | stone-700 | footnote text |

The names `primary` and `secondary` take on shadcn's meaning; stone and yellow survive only as token values. All styling goes through the tokens.

- **`components/ui/button.tsx`:** generated with the shadcn CLI, then edited so the variants `default`, `secondary` and `ghost` reproduce the current button: uppercase, monospace, `h-8`, `text-xs`, with the `highlight` active state. `Navigation` renders links as `Button asChild` around `next/link`.
- **`components/ui/dropdown-menu.tsx`:** generated, with items restyled to match the current dropdown list items.
- **`ThemeSelector`:** rebuilt on `DropdownMenu` with a radio group for system, dark and light. It shows Lucide's `Snowflake`, `Moon` and `Sun` icons. The `icon` values in `content/layout.json` become Lucide icon names, resolved through a small map in the component.
- **Theme provider:** `next-themes` (`attribute="class"`, `defaultTheme="system"`, `enableSystem`) replaces the custom `ThemeProvider`. `<html>` gets `suppressHydrationWarning`. The particle canvas reads `resolvedTheme`.
- **Layout and text styles:** `container`, `main`, `header`, `footer`, `stack`, `menu` and `text` become Tailwind classes inside the components that use them.
- **Removed:** `lib/styles/`, `@headlessui/react`, the icon font file and its `@font-face` rule.

Testing:

- The component tests are updated for the new markup.
- A `ThemeSelector` test opens the menu and asserts that choosing an option calls `setTheme`, with `next-themes` mocked.
- `vitest.setup.ts` adds the `ResizeObserver` and pointer-capture polyfills that Radix needs in jsdom.

Done when:

- All checks pass.
- `lib/styles/` and the icon font are gone, and no `cva` call remains outside `components/ui/`.
- The preview matches production apart from the icon glyphs.
- A hard reload with dark mode set shows no flash of the light theme.
- The theme menu works by keyboard: arrow keys, Enter and Escape.

### Story 3: add Storybook

Goal: the shadcn components and the theme selector can be browsed in isolation, in light and dark.

- **Framework:** Storybook 10 with `@storybook/nextjs-vite`.
- **Global styles:** `.storybook/preview.ts` imports `app/globals.css`, so stories use the real tokens and fonts.
- **Light and dark:** `@storybook/addon-themes` with `withThemeByClassName` provides a toolbar switch that toggles `.dark`.
- **Stories,** next to their components:
  - `components/ui/button.stories.tsx` shows every variant, plus a link rendered through `asChild`.
  - `components/ui/dropdown-menu.stories.tsx` shows a radio group with icons.
  - `components/theme-selector.stories.tsx` shows the real component inside the `next-themes` provider.

  Layout components get no stories.
- **Scripts:** `npm run storybook` starts the dev server on port 6006, and `npm run build-storybook` builds it.
- **CI:** the Continuous Integration workflow runs `build-storybook`, so a broken story fails the pull request. Storybook is not deployed.

Done when both scripts work, every story renders in light and dark, and CI builds Storybook.

# Flatten to a single npm Next.js app: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, in this session, on the branch `refactor/single-npm-app`. Subagents may review; they never implement (see `~/.claude/CLAUDE.md`). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the pnpm monorepo into one npm package running Next.js 16 (App Router), React 19, Tailwind 4, Biome and Vitest 5, with the site looking and behaving the same. This is story #33 of epic #32.

**Architecture:** The work happens in place, in six commits:

1. Move everything into one npm package, keeping the current framework versions, and replace ESLint and Prettier with Biome.
2. Upgrade the framework and test stack, still on the Pages Router.
3. Move to the App Router.
4. Move to Tailwind 4 and `next/font/local`.
5. Modernise the commit hooks and release tooling.
6. Rewrite the docs.

Every commit leaves a site that builds and passes its checks. The `cva` style functions from `@vanesterik/ui` move unchanged to `lib/styles/`; story #34 replaces them.

**Tech stack:** Next.js 16.4, React 19.3, TypeScript 7.0, Tailwind CSS 4.3, Headless UI 2.2, Biome 2.5.15, Vitest 5.0 with Testing Library 16 and jsdom 30, Husky 9, lint-staged 17, commitlint 21, commit-and-tag-version 13.

**Spec:** `docs/specs/2026-10-08-repository-overhaul-design.md`, "Story 1".

## Global constraints

- **Package manager:** npm only. One `package.json` and a committed `package-lock.json`. `packageManager` is pinned to the local npm version, and Node 24 is pinned in `.nvmrc`.
- **Output:** a static export, with `output: 'export'`, `trailingSlash: true` and `basePath`/`assetPrefix` from `NEXT_PUBLIC_BASE_PATH` (default `''`).
- **No server features:** no route handlers, server actions, middleware or default image optimizer.
- **Server components by default.** Only `components/theme-provider.tsx`, `components/theme-selector.tsx` and `components/particle-canvas.tsx` start with `'use client'`.
- **`content/layout.json` keeps its shape** in this story.
- **Restricted palette:** only `black`, `white`, `primary-*` (Tailwind stone) and `secondary-*` (Tailwind yellow) exist. The font families are only `sans` (Lausanne), `mono` (NB International Pro Mono) and `icon` (Icons).
- **Biome formatting:** two-space indent, 80 columns, single quotes in JS/TS and CSS, double quotes in JSX, no semicolons, trailing commas everywhere, arrow parentheses always.
- **Commit messages:** conventional commits with a lowercase subject (commitlint rejects sentence, start and pascal case). End each with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Before each commit,** run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`, and confirm they pass.
- **Push each task commit as soon as it's made,** so CI proves each commit on its own.

**Deviation from the spec:** the spec lists a `start` script. `next start` doesn't work with `output: 'export'`, so there is no `start` script. Task 6 corrects the spec.

## Review focus

The five conditions most likely to cause a problem that no unit test catches. Each line names the task that pins it.

1. **`NEXT_PUBLIC_BASE_PATH` set** (as for a project page under a sub-path): every script, style and font URL in `out/` carries the prefix. Pinned in Task 4, step 7.
2. **Choosing a theme from the dropdown,** by mouse or keyboard, after the Headless UI 1 to 2 upgrade: the `dark` class follows the choice, and Escape closes the list without changing it. Pinned in Task 2, step 1 (characterisation test written before the upgrade).
3. **Deep links with trailing slashes** (`/about/`, `/projects/`, `/posts/`) and unknown paths: each gets its own `index.html`, and unknown paths serve `404.html`. Pinned by the `out/` listing in Task 3, step 9.
4. **Theme change while on the home page:** the particle canvas restarts in the new colours and doesn't stack a second canvas. Pinned by the manual check in Task 3, step 10.
5. **Visual parity after Tailwind 4:** v4 uses oklch palette values and applies `hover:` only on devices that support hover. The page must look the same in light and dark on a desktop browser. Pinned by the manual check in Task 4, step 8.

---

### Task 1: Move everything into one npm package and replace ESLint and Prettier with Biome

This is an integration task and goes over the ten-file guideline: almost all of its changed files are renames and deletions. ESLint is replaced here, not in a later task, because the three per-package ESLint configs (a GitHub-hosted shared config plus `next lint`) can't be merged into one package without writing a combined config that the next task would delete.

Framework versions stay at what `pnpm-lock.yaml` resolved, so this commit only restructures.

**Files:**
- Move: `apps/next/src/pages/**` → `pages/**`
- Move: `apps/next/src/components/<Name>/<Name>.tsx` → `components/<kebab-name>.tsx`. Tests go to `components/<kebab-name>.test.tsx`, and the snapshot to `components/__snapshots__/prompt.test.tsx.snap`.
- Move: `packages/ui/lib/*.ts` (all except `game.ts`) → `lib/styles/*.ts`, and `packages/ui/index.ts` → `lib/styles/index.ts`
- Move: `packages/ui/lib/game.ts` → `lib/particles.ts`
- Move: `packages/utils/helpers/{random,repeat}{,.test}.ts` → `lib/`
- Move: `packages/data/layout.json` → `content/layout.json`
- Move: `packages/fonts/files/*.woff2` → `styles/fonts/`
- Move: `apps/next/public/favicon.ico` → `public/favicon.ico`
- Move: `apps/next/next-env.d.ts` → `next-env.d.ts`, and `apps/next/vitest.setup.ts` → `vitest.setup.ts`
- Create: `styles/globals.css`, `package.json` (rewrite), `tsconfig.json`, `next.config.js`, `tailwind.config.js`, `postcss.config.js`, `vitest.config.ts`, `biome.json`, `.nvmrc`
- Modify: `.lintstagedrc.js`, `.husky/pre-commit`, `.husky/commit-msg`, `.gitignore`, `.github/actions/setup-node/action.yml`, `.github/workflows/continuous-integration.yml`, `.github/workflows/preview-environment.yml`, `.github/workflows/production-environment.yml`
- Delete: `apps/`, `packages/`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `vitest.workspace.ts`, `.prettierrc`, `.github/workflows/e2e-tests.yml`

**Interfaces:**
- Produces:
  - `@/lib/styles` re-exports `button`, `card`, `container`, `dropdown`, `footer`, `header`, `icon`, `IconVariant`, `main`, `menu`, `stack` and `text`.
  - `@/lib/styles/dropdown` exports `dropdownList` and `dropdownListItem`.
  - `@/lib/particles` exports `game(containerId: string, isDarkMode?: boolean): () => void`.
  - `@/lib/random` exports `random(min: number, max: number): number`.
  - `@/lib/repeat` exports `repeat<T>(numTimes: number, callback: (index: number) => T): T[]`.
  - `@/components/<kebab-name>` exports the same named components as before: `ComingSoon`, `Footer`, `Header`, `LinkList` with `isAlternativeLink`, `Navigation`, `Prompt`, `ThemeProvider` with `useTheme`, and `ThemeSelector`.
  - The `@/*` path alias resolves from the repository root in both Next.js and Vitest.

- [ ] **Step 1: Move the source files with `git mv`**

```bash
mkdir -p components/__snapshots__ lib/styles content styles/fonts public
for n in ComingSoon:coming-soon Footer:footer Header:header LinkList:link-list Navigation:navigation Prompt:prompt ThemeProvider:theme-provider ThemeSelector:theme-selector; do
  src=${n%%:*}; dst=${n##*:}
  git mv apps/next/src/components/$src/$src.tsx components/$dst.tsx
  [ -f apps/next/src/components/$src/$src.test.tsx ] && git mv apps/next/src/components/$src/$src.test.tsx components/$dst.test.tsx
done
git mv apps/next/src/components/Prompt/__snapshots__/Prompt.test.tsx.snap components/__snapshots__/prompt.test.tsx.snap
git mv apps/next/src/pages pages
for f in button card container dropdown footer header icon main menu stack text; do git mv packages/ui/lib/$f.ts lib/styles/$f.ts; done
git mv packages/ui/index.ts lib/styles/index.ts
git mv packages/ui/lib/game.ts lib/particles.ts
for f in random random.test repeat repeat.test; do git mv packages/utils/helpers/$f.ts lib/$f.ts; done
git mv packages/data/layout.json content/layout.json
for f in packages/fonts/files/*.woff2; do git mv "$f" styles/fonts/; done
git mv apps/next/public/favicon.ico public/favicon.ico
git mv apps/next/next-env.d.ts next-env.d.ts
git mv apps/next/vitest.setup.ts vitest.setup.ts
```

- [ ] **Step 2: Delete the rest of the monorepo**

```bash
git rm -r -q apps packages pnpm-workspace.yaml pnpm-lock.yaml vitest.workspace.ts .prettierrc .github/workflows/e2e-tests.yml
```

Expected: `git status` shows no remaining files under `apps/` or `packages/`.

- [ ] **Step 3: Rewrite the imports**

```bash
sed -i '' \
  -e "s#from '@vanesterik/ui/lib/dropdown'#from '@/lib/styles/dropdown'#" \
  -e "s#from '@vanesterik/ui'#from '@/lib/styles'#" \
  components/*.tsx
sed -i '' -e "s#from '../ThemeProvider'#from './theme-provider'#" components/theme-selector.tsx
for n in ComingSoon:coming-soon Footer:footer Header:header LinkList:link-list Prompt:prompt; do
  sed -i '' -e "s#from './${n%%:*}'#from './${n##*:}'#" components/${n##*:}.test.tsx
done
sed -i '' -e "s#from '@vanesterik/utils'#from '@/lib/random'#" lib/particles.ts
```

In `lib/styles/index.ts`, remove the line `export { game } from './lib/game'`, and change every `'./lib/<name>'` to `'./<name>'`:

```bash
sed -i '' -e "/export { game }/d" -e "s#'./lib/#'./#" lib/styles/index.ts
```

Replace the pages with these contents:

`pages/_app.tsx`:

```tsx
import '@/styles/globals.css'

import { AppProps } from 'next/app'

import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { LinkList } from '@/components/link-list'
import { Navigation } from '@/components/navigation'
import { Prompt } from '@/components/prompt'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeSelector } from '@/components/theme-selector'
import layout from '@/content/layout.json'
import { container, main, text } from '@/lib/styles'

function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <div className={container()}>
        <Header>
          <Navigation items={layout.menu} />
          <ThemeSelector options={layout.theme} />
        </Header>
        <main className={main()}>
          <Component {...pageProps} />
        </main>
        <Footer>
          <Prompt />
          <LinkList items={layout.contact} />
          <Prompt />
          <LinkList items={layout.social} />
          <div className={text({ intent: 'footnote' })}>
            &copy; {new Date().getFullYear().toString()}
          </div>
          <div className={text({ intent: 'footnote' })}>{layout.copyright}</div>
        </Footer>
      </div>
    </ThemeProvider>
  )
}

export default App
```

`pages/index.tsx`:

```tsx
import { useEffect } from 'react'

import { useTheme } from '@/components/theme-provider'
import { game } from '@/lib/particles'

const GAME_CONTAINER_ID = 'game-container'

export default function Index() {
  const { isDarkMode } = useTheme()

  useEffect(() => {
    // Trigger game function and define finalize function to be used in
    // useEffect cleanup
    const finalize = game(GAME_CONTAINER_ID, isDarkMode)

    return () => finalize()
  }, [isDarkMode])

  return <div className="relative h-full w-full" id={GAME_CONTAINER_ID} />
}
```

In `pages/about/index.tsx`, `pages/projects/index.tsx` and `pages/posts/index.tsx`, replace `import { ComingSoon } from '../../components'` with `import { ComingSoon } from '@/components/coming-soon'`:

```bash
sed -i '' -e "s#from '../../components'#from '@/components/coming-soon'#" pages/*/index.tsx
```

Run: `grep -rn "@vanesterik\|'\.\./components'\|'\.\./\.\./components'" pages components lib`
Expected: no output.

- [ ] **Step 4: Write the stylesheet and the root configs**

`styles/globals.css` combines `packages/fonts/index.css` and `packages/ui/index.css`, with the font paths updated:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@font-face {
  font-display: swap;
  font-family: 'Lausanne';
  font-style: normal;
  font-weight: 700;
  src: url('./fonts/twk_lausanne_700.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA,
    U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215,
    U+FEFF, U+FFFD;
}

@font-face {
  font-display: swap;
  font-family: 'Lausanne';
  font-style: normal;
  font-weight: 400;
  src: url('./fonts/twk_lausanne_400.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA,
    U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215,
    U+FEFF, U+FFFD;
}

@font-face {
  font-display: swap;
  font-family: 'NB International Pro Mono';
  font-style: normal;
  font-weight: 400;
  src: url('./fonts/nb_international_pro_mono.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA,
    U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215,
    U+FEFF, U+FFFD;
}

@font-face {
  font-display: swap;
  font-family: 'Icons';
  font-style: normal;
  font-weight: 400;
  src: url('./fonts/icomoon.woff2') format('woff2');
}

@layer base {
  body {
    @apply antialiased;
    @apply bg-white dark:bg-black;
  }
}
```

`package.json` (the versions are the ones `pnpm-lock.yaml` resolved, so nothing upgrades in this task):

```json
{
  "name": "vanesterik.dev",
  "version": "1.1.0",
  "private": true,
  "engines": {
    "node": ">=24"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "lint": "biome check",
    "format": "biome check --write",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "coverage": "vitest run --coverage",
    "prepare": "husky install",
    "release": "standard-version"
  },
  "dependencies": {
    "@headlessui/react": "1.7.19",
    "class-variance-authority": "0.7.1",
    "next": "13.5.11",
    "react": "18.3.1",
    "react-dom": "18.3.1"
  },
  "devDependencies": {
    "@biomejs/biome": "2.5.15",
    "@commitlint/config-conventional": "17.8.1",
    "@testing-library/jest-dom": "6.6.4",
    "@testing-library/react": "14.0.0",
    "@types/node": "20.5.8",
    "@types/react": "18.2.21",
    "@types/react-dom": "18.3.7",
    "@vitejs/plugin-react": "4.7.0",
    "@vitest/coverage-v8": "0.34.6",
    "autoprefixer": "10.4.21",
    "commitlint": "17.8.1",
    "husky": "8.0.3",
    "jsdom": "22.1.0",
    "lint-staged": "14.0.1",
    "postcss": "8.5.6",
    "standard-version": "9.5.0",
    "tailwindcss": "3.4.17",
    "typescript": "5.2.2",
    "vitest": "0.34.6"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

`next.config.js`:

```js
/** @type {import('next').NextConfig} */
module.exports = {
  output: 'export',
  reactStrictMode: true,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
  trailingSlash: true,
}
```

`tailwind.config.js` (the old shared theme, with this repository's content paths):

```js
const colors = require('tailwindcss/colors')
const defaultTheme = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.ts',
  ],
  darkMode: 'class',
  theme: {
    colors: {
      black: colors.black,
      primary: colors.stone,
      secondary: colors.yellow,
      white: colors.white,
    },
    fontFamily: {
      mono: ['NB International Pro Mono', ...defaultTheme.fontFamily.mono],
      sans: ['Lausanne', ...defaultTheme.fontFamily.sans],
      icon: ['Icons'],
    },
  },
}
```

`postcss.config.js`:

```js
module.exports = {
  plugins: {
    'tailwindcss/nesting': {},
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

`vitest.config.ts`:

```ts
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@\//, replacement: fileURLToPath(new URL('./', import.meta.url)) },
    ],
  },
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
  },
})
```

`biome.json`. The override switches off linting for `styles/globals.css` while it still uses Tailwind 3's `@tailwind` directives; Task 4 removes it.

```json
{
  "$schema": "https://biomejs.dev/schemas/2.5.15/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignoreUnknown": true
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 80
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "jsxQuoteStyle": "double",
      "semicolons": "asNeeded",
      "trailingCommas": "all",
      "arrowParentheses": "always"
    }
  },
  "css": {
    "formatter": {
      "quoteStyle": "single"
    },
    "parser": {
      "tailwindDirectives": true
    }
  },
  "assist": {
    "enabled": true,
    "actions": {
      "source": {
        "organizeImports": "on"
      }
    }
  },
  "overrides": [
    {
      "includes": ["styles/globals.css"],
      "linter": {
        "enabled": false
      }
    }
  ]
}
```

`.nvmrc`:

```
24
```

- [ ] **Step 5: Point the commit hooks and lint-staged at npm and Biome**

`.lintstagedrc.js`:

```js
module.exports = {
  '*.{js,jsx,ts,tsx,json,jsonc,css}':
    'biome check --write --no-errors-on-unmatched --files-ignore-unknown=true',
}
```

`.husky/pre-commit`:

```sh
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run typecheck
npx lint-staged
```

`.husky/commit-msg`:

```sh
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx --no -- commitlint --edit "$1"
```

In `.gitignore`, delete the `# turbo` block (`.turbo`, `.vercel`, `.turbo-cache`), the second `# vscode` block, the `# Playwright` block and the `.eslintcache` line.

- [ ] **Step 6: Point CI and deployment at npm**

`.github/actions/setup-node/action.yml`:

```yaml
name: Setup Node & npm

runs:
  using: 'composite'
  steps:
    - name: Setup Node
      uses: actions/setup-node@v4
      with:
        node-version-file: .nvmrc
        cache: npm

    - name: Install dependencies
      run: npm ci
      shell: bash
```

`.github/workflows/continuous-integration.yml`: replace the four `run:` lines with `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`.

`.github/workflows/preview-environment.yml`:
- Replace `run: pnpm --filter next build` with `run: npm run build`.
- Replace `aws s3 sync ./apps/next/out s3://$BUCKET_NAME --delete` with `aws s3 sync ./out s3://$BUCKET_NAME --delete`.

`.github/workflows/production-environment.yml`:
- Replace `run: pnpm --filter next build` with `run: npm run build`.
- Replace `./apps/next/out` with `./out`.

`.github/workflows/web-performance-audit.yml` and `.github/dependabot.yml` stay as they are. The audit uses only the setup action, and Dependabot already uses the `npm` ecosystem at `/`.

Run: `grep -rn pnpm .github .husky package.json`
Expected: no output.

- [ ] **Step 7: Install, then pin the package manager**

```bash
rm -rf node_modules
npm install
npm pkg set packageManager="npm@$(npm --version)"
```

Expected: `package-lock.json` is created, `npm install` exits 0, and `.husky/_/husky.sh` exists because `prepare` ran.

- [ ] **Step 8: Apply Biome's automatic fixes**

```bash
npx biome check --write
```

Expected: the formatting, `import type` and import-order fixes are applied. Three diagnostics remain in `lib/particles.ts` (two `lint/suspicious/useIterableCallbackReturn` and one `lint/performance/noAccumulatingSpread`). Step 9 fixes them.

- [ ] **Step 9: Fix the remaining diagnostics in `lib/particles.ts`**

In `createStore`, delete the two `// eslint-disable-next-line fp/...` comment lines, and give the `forEach` callback a block body:

```ts
    listeners.forEach((listener) => {
      listener(state, previousState)
    })
```

In `updateParticlePositions`, give the `forEach` callback a block body:

```ts
  particles.forEach(({ id, vx, vy, x, y }) => {
    dispatch({
      type: ActionTypes.UPDATE_PARTICLE_POSITION,
      payload: {
        id,
        x: x + vx,
        y: y + vy,
      },
    })
  })
```

In `createParticles`, replace the accumulating `reduce` with `Object.fromEntries`. The original used `id` and `index` interchangeably, because both come from the same `keys()` sequence:

```ts
  const particles: Record<number, Particle> = Object.fromEntries(
    Array.from(Array(gridX * gridY).keys()).map((id) => {
      const cellX = Math.floor(id % gridX)
      const cellY = Math.floor((id / gridX) % gridY)
      const isLeftCells = cellX < gridX / 2

      return [
        id,
        {
          id,
          radius,
          type: isLeftCells ? ParticleTypes.FILL : ParticleTypes.STROKE,
          vx: isLeftCells ? random(1, 2) : random(-1, -2),
          vy: random(-1, -5),
          x: gridSize * cellX,
          y: gridSize * cellY,
        },
      ]
    }),
  )
```

Run: `npm run lint`
Expected: `Checked N files` with no errors.

- [ ] **Step 10: Run every check**

Run: `npm run typecheck && npm test && npm run build && ls out out/about out/projects out/posts`
Expected:
- `tsc` exits 0.
- Vitest reports 7 test files passing (the 5 component tests plus `random` and `repeat`) and the `Prompt` snapshot unchanged.
- If `next build` rewrote `tsconfig.json`, keep its rewrite and run `npm run lint` again.
- `next build` exports.
- `out/` contains `index.html` and `404.html`, and each of `about`, `projects` and `posts` contains an `index.html`.

- [ ] **Step 11: Commit and push**

```bash
git add -A
git commit -F - <<'EOF'
refactor: flatten monorepo into a single npm package

Move apps/next and the workspace packages into one npm package at the
repository root, at the framework versions pnpm had resolved. Replace
ESLint and Prettier with Biome, point CI, deployment and the commit
hooks at npm, and remove the Playwright end-to-end tests.

This integration commit goes over ten files; almost all of them are
renames and deletions.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git push
```

Expected: the pre-commit hook runs the typecheck and lint-staged, and commitlint accepts the message.

---

### Task 2: Upgrade to Next.js 16, React 19, TypeScript 7, Headless UI 2 and Vitest 5

This task stays on the Pages Router, so the upgrade can be reviewed apart from the routing change.

**Files:**
- Create: `components/theme-selector.test.tsx`, `next.config.ts`
- Modify: `package.json`, `package-lock.json`, `tsconfig.json`, `components/theme-selector.tsx`, `.gitignore`
- Delete: `next.config.js`, `next-env.d.ts` (it becomes generated and git-ignored)

**Interfaces:**
- Consumes: `ThemeProvider`, `ThemeSelector` and `useTheme` from Task 1.
- Produces: no new names. `ThemeSelector`'s props stay `{ options: { icon: string; name: string }[] }`.

- [ ] **Step 1: Write a characterisation test for the theme selector, before upgrading**

Install the user-event library, which simulates real pointer and keyboard sequences:

```bash
npm install -D @testing-library/user-event@^14.6.7
```

`components/theme-selector.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ThemeProvider } from './theme-provider'
import { ThemeSelector } from './theme-selector'

const options = [
  { name: 'system', icon: 'snowflake' },
  { name: 'dark', icon: 'moon' },
  { name: 'light', icon: 'sun' },
]

const renderSelector = () =>
  render(
    <ThemeProvider>
      <ThemeSelector options={options} />
    </ThemeProvider>,
  )

beforeEach(() => {
  // jsdom has no matchMedia; report a light system preference
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  )
  document.documentElement.classList.remove('dark')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ThemeSelector', () => {
  it('shows the current theme on its button', () => {
    renderSelector()
    expect(screen.getByRole('button', { name: /system/i })).toBeInTheDocument()
  })

  it('applies the dark theme when dark is chosen', async () => {
    const user = userEvent.setup()
    renderSelector()

    await user.click(screen.getByRole('button', { name: /system/i }))
    await user.click(screen.getByRole('option', { name: /dark/i }))

    expect(document.documentElement).toHaveClass('dark')
  })

  it('closes on Escape without changing the theme', async () => {
    const user = userEvent.setup()
    renderSelector()

    await user.click(screen.getByRole('button', { name: /system/i }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(document.documentElement).not.toHaveClass('dark')
  })
})
```

- [ ] **Step 2: Run it against the current versions**

Run: `npx vitest run components/theme-selector.test.tsx`
Expected: 3 tests pass. This pins the current behaviour before the upgrade.

- [ ] **Step 3: Upgrade the packages**

```bash
npm install next@^16.4.0 react@^19.3.0 react-dom@^19.3.0 @headlessui/react@^2.2.10
npm install -D typescript@^7.0.2 @types/react@^19.3.0 @types/react-dom@^19.3.0 @types/node@^24.19.1 \
  vitest@^5.0.3 @vitest/coverage-v8@^5.0.3 vite@^8.3.4 @vitejs/plugin-react@^6.1.2 jsdom@^30.1.2 \
  @testing-library/react@^16.3.3 @testing-library/dom@^10.4.2 @testing-library/jest-dom@^7.0.1
```

Expected: both commands exit 0, with no `ERESOLVE` errors.

- [ ] **Step 4: Run the selector test against Headless UI 2**

Run: `npx vitest run components/theme-selector.test.tsx`
Expected: 3 tests pass. Headless UI 2 still accepts the deprecated dot notation (`Listbox.Button`), which step 5 replaces.

- [ ] **Step 5: Move `ThemeSelector` to Headless UI 2's named components**

`components/theme-selector.tsx`:

```tsx
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/react'

import { button, dropdown, type IconVariant, icon } from '@/lib/styles'
import { dropdownList, dropdownListItem } from '@/lib/styles/dropdown'

import { useTheme } from './theme-provider'

type ThemeOption = {
  icon: string
  name: string
}

type ThemeSelectorProps = {
  options: ThemeOption[]
}

export const ThemeSelector = ({ options }: ThemeSelectorProps) => {
  const { theme, setTheme } = useTheme()

  if (!theme) return null

  return (
    <Listbox value={theme} onChange={setTheme}>
      <div className={dropdown()}>
        <ListboxButton className={button({ intent: 'secondary' })}>
          <span
            className={icon({
              name: 'sun',
              class: 'dark:hidden',
            })}
          />
          <span
            className={icon({
              name: 'moon',
              class: 'hidden dark:block',
            })}
          />
          {theme}
        </ListboxButton>
        <ListboxOptions className={dropdownList({ side: 'right' })}>
          {options.map(({ icon: iconName, name }) => (
            <ListboxOption
              className={dropdownListItem()}
              key={name}
              value={name}
            >
              <span className={icon({ name: iconName as IconVariant })} />
              {name}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  )
}
```

Run: `npx vitest run components/theme-selector.test.tsx`
Expected: 3 tests pass.

- [ ] **Step 6: Replace `next.config.js` with `next.config.ts`**

```bash
git rm -q next.config.js
```

`next.config.ts`:

```ts
import type { NextConfig } from 'next'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

const nextConfig: NextConfig = {
  output: 'export',
  reactStrictMode: true,
  basePath,
  assetPrefix: basePath,
  trailingSlash: true,
}

export default nextConfig
```

- [ ] **Step 7: Update the TypeScript setup for Next.js 16 and TypeScript 7**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

`next-env.d.ts` is regenerated by Next.js 16, so stop tracking it:

```bash
git rm -q --cached next-env.d.ts
printf '\n# next.js generated types\nnext-env.d.ts\n' >> .gitignore
npm pkg set scripts.typecheck="next typegen && tsc --noEmit"
```

Next.js 16 type-checks with the project's own `tsc` CLI by default, which is what makes TypeScript 7 work. Don't set `experimental.useTypeScriptCli` to `false`.

- [ ] **Step 8: Run every check**

Run: `npm run lint && npm run typecheck && npm test && npm run build && ls out out/about out/projects out/posts`
Expected:
- All commands exit 0.
- Vitest reports 8 test files passing, and the `Prompt` snapshot is unchanged.
- If Biome reports import order, run `npm run format` and check again.
- `out/` has the same listing as in Task 1.
- If `next build` rewrote `tsconfig.json`, keep its rewrite: it's the version Next.js 16 expects. Run `npm run lint` again afterwards.

- [ ] **Step 9: Commit and push**

```bash
git add -A
git commit -F - <<'EOF'
build: upgrade to next 16, react 19, typescript 7 and vitest 5

Upgrade the framework and test stack while still on the Pages Router.
Move the theme selector to Headless UI 2's named components, pinned by
a characterisation test written before the upgrade. next-env.d.ts is
now generated by `next typegen` and ignored.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git push
```

---

### Task 3: Move to the App Router

**Files:**
- Move: `styles/globals.css` → `app/globals.css`, and `styles/fonts/*.woff2` → `app/fonts/`
- Create: `app/layout.tsx`, `app/page.tsx`, `app/about/page.tsx`, `app/projects/page.tsx`, `app/posts/page.tsx`, `app/not-found.tsx`, `components/particle-canvas.tsx`
- Modify: `components/theme-provider.tsx`, `components/theme-selector.tsx`, `tailwind.config.js`, `biome.json`
- Delete: `pages/`

**Interfaces:**
- Consumes: the components from Task 1, `game` from `@/lib/particles`, and `useTheme` from `@/components/theme-provider`.
- Produces: `ParticleCanvas` (no props) from `@/components/particle-canvas`, and the App Router routes `/`, `/about/`, `/projects/`, `/posts/` and the not-found page.

- [ ] **Step 1: Move the stylesheet and fonts into `app/`**

```bash
mkdir -p app/fonts
git mv styles/globals.css app/globals.css
for f in styles/fonts/*.woff2; do git mv "$f" app/fonts/; done
```

In `biome.json`, change the override's `"includes": ["styles/globals.css"]` to `"includes": ["app/globals.css"]`.

In `tailwind.config.js`, change the `content` array to:

```js
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.ts',
  ],
```

- [ ] **Step 2: Mark the client components**

Add `'use client'` followed by a blank line as the first line of `components/theme-provider.tsx` and `components/theme-selector.tsx`.

- [ ] **Step 3: Create the particle canvas client component**

`components/particle-canvas.tsx`:

```tsx
'use client'

import { useEffect } from 'react'

import { game } from '@/lib/particles'

import { useTheme } from './theme-provider'

const GAME_CONTAINER_ID = 'game-container'

export const ParticleCanvas = () => {
  const { isDarkMode } = useTheme()

  useEffect(() => {
    // Trigger game function and define finalize function to be used in
    // useEffect cleanup
    const finalize = game(GAME_CONTAINER_ID, isDarkMode)

    return () => finalize()
  }, [isDarkMode])

  return <div className="relative h-full w-full" id={GAME_CONTAINER_ID} />
}
```

- [ ] **Step 4: Create the root layout**

`app/layout.tsx`:

```tsx
import './globals.css'

import type { ReactNode } from 'react'

import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { LinkList } from '@/components/link-list'
import { Navigation } from '@/components/navigation'
import { Prompt } from '@/components/prompt'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeSelector } from '@/components/theme-selector'
import layout from '@/content/layout.json'
import { container, main, text } from '@/lib/styles'

type RootLayoutProps = {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <div className={container()}>
            <Header>
              <Navigation items={layout.menu} />
              <ThemeSelector options={layout.theme} />
            </Header>
            <main className={main()}>{children}</main>
            <Footer>
              <Prompt />
              <LinkList items={layout.contact} />
              <Prompt />
              <LinkList items={layout.social} />
              <div className={text({ intent: 'footnote' })}>
                &copy; {new Date().getFullYear().toString()}
              </div>
              <div className={text({ intent: 'footnote' })}>
                {layout.copyright}
              </div>
            </Footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

The year is computed at build time, as it was with the static Pages Router export.

- [ ] **Step 5: Create the pages**

`app/page.tsx`:

```tsx
import { ParticleCanvas } from '@/components/particle-canvas'

export default function Home() {
  return <ParticleCanvas />
}
```

`app/about/page.tsx`, `app/projects/page.tsx` and `app/posts/page.tsx` (identical):

```tsx
import { ComingSoon } from '@/components/coming-soon'

export default function Page() {
  return <ComingSoon />
}
```

`app/not-found.tsx`:

```tsx
export default function NotFound() {
  return (
    <h1 className="font-bold text-black text-8xl dark:text-white">not found</h1>
  )
}
```

- [ ] **Step 6: Delete the Pages Router**

```bash
git rm -r -q pages
rmdir styles/fonts styles 2>/dev/null || true
```

- [ ] **Step 7: Run the type check and the tests**

Run: `npm run typecheck && npm test`
Expected: both pass, with 8 test files.

- [ ] **Step 8: Run lint**

Run: `npm run lint`
Expected: no errors. If Biome reports import order in the new files, run `npm run format` and check again.

- [ ] **Step 9: Build and check the exported routes**

Run: `npm run build && ls out out/about out/projects out/posts`
Expected:
- The build exits 0.
- `out/` contains `index.html` and `404.html`, and each route directory contains `index.html`.
- `grep -c 'game-container' out/index.html` prints `1`.

- [ ] **Step 10: Check the site in a browser**

Run: `npm run dev`, open http://localhost:3000 and check:
- The header, navigation, theme button, particle animation and footer look as they did before.
- Choosing dark, then light, then system from the theme menu switches the colours, including the particles. The page keeps exactly one `<canvas id="game">` (check in the devtools Elements panel).
- `/about/`, `/projects/` and `/posts/` show "coming soon", and `/nope/` shows "not found".

Stop the dev server afterwards.

- [ ] **Step 11: Commit and push**

```bash
git add -A
git commit -F - <<'EOF'
refactor: move to the app router

Replace pages/_app and the page files with an app/ root layout and
pages. The particle canvas becomes a client component; the theme
provider and selector are marked as client components.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git push
```

---

### Task 4: Move to Tailwind 4 and load the fonts with `next/font/local`

**Files:**
- Create: `postcss.config.mjs`
- Modify: `app/globals.css`, `app/layout.tsx`, `lib/styles/dropdown.ts`, `biome.json`, `package.json`, `package-lock.json`
- Delete: `tailwind.config.js`, `postcss.config.js`

**Interfaces:**
- Consumes: `app/layout.tsx` from Task 3.
- Produces: the CSS variables `--font-lausanne` and `--font-nb-international-pro-mono` on `<html>`, and Tailwind theme variables for the restricted palette and fonts. Story #34 builds its tokens on these.

- [ ] **Step 1: Swap the packages**

```bash
npm uninstall autoprefixer
npm install -D tailwindcss@^4.3.3 @tailwindcss/postcss@^4.3.3 postcss@^8.5.6
git rm -q tailwind.config.js postcss.config.js
```

`postcss.config.mjs`:

```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

- [ ] **Step 2: Rewrite `app/globals.css` for Tailwind 4**

The colour values are Tailwind 4.3.3's own stone and yellow scales. `--color-*: initial` and `--font-*: initial` keep the palette and font families as restricted as the old config. Tailwind 4 finds the classes in `app/`, `components/` and `lib/` without a content list.

```css
@import 'tailwindcss';

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --color-*: initial;
  --color-black: #000;
  --color-white: #fff;

  --color-primary-50: oklch(98.5% 0.001 106.423);
  --color-primary-100: oklch(97% 0.001 106.424);
  --color-primary-200: oklch(92.3% 0.003 48.717);
  --color-primary-300: oklch(86.9% 0.005 56.366);
  --color-primary-400: oklch(70.9% 0.01 56.259);
  --color-primary-500: oklch(55.3% 0.013 58.071);
  --color-primary-600: oklch(44.4% 0.011 73.639);
  --color-primary-700: oklch(37.4% 0.01 67.558);
  --color-primary-800: oklch(26.8% 0.007 34.298);
  --color-primary-900: oklch(21.6% 0.006 56.043);
  --color-primary-950: oklch(14.7% 0.004 49.25);

  --color-secondary-50: oklch(98.7% 0.026 102.212);
  --color-secondary-100: oklch(97.3% 0.071 103.193);
  --color-secondary-200: oklch(94.5% 0.129 101.54);
  --color-secondary-300: oklch(90.5% 0.182 98.111);
  --color-secondary-400: oklch(85.2% 0.199 91.936);
  --color-secondary-500: oklch(79.5% 0.184 86.047);
  --color-secondary-600: oklch(68.1% 0.162 75.834);
  --color-secondary-700: oklch(55.4% 0.135 66.442);
  --color-secondary-800: oklch(47.6% 0.114 61.907);
  --color-secondary-900: oklch(42.1% 0.095 57.708);
  --color-secondary-950: oklch(28.6% 0.066 53.813);

  --font-*: initial;
  --font-sans: var(--font-lausanne), ui-sans-serif, system-ui, sans-serif,
    'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol',
    'Noto Color Emoji';
  --font-mono: var(--font-nb-international-pro-mono), ui-monospace,
    SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
  --font-icon: 'Icons';
}

@font-face {
  font-display: swap;
  font-family: 'Icons';
  font-style: normal;
  font-weight: 400;
  src: url('./fonts/icomoon.woff2') format('woff2');
}

@layer base {
  body {
    @apply antialiased bg-white dark:bg-black;
  }
}
```

- [ ] **Step 3: Load the text fonts in the layout**

In `app/layout.tsx`, add this import below `import type { ReactNode } from 'react'`:

```tsx
import localFont from 'next/font/local'
```

Add these font definitions above `type RootLayoutProps`:

```tsx
const lausanne = localFont({
  src: [
    { path: './fonts/twk_lausanne_400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/twk_lausanne_700.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-lausanne',
})

const nbInternationalProMono = localFont({
  src: './fonts/nb_international_pro_mono.woff2',
  weight: '400',
  style: 'normal',
  display: 'swap',
  variable: '--font-nb-international-pro-mono',
})
```

Change `<html lang="en">` to:

```tsx
    <html
      lang="en"
      className={`${lausanne.variable} ${nbInternationalProMono.variable}`}
    >
```

- [ ] **Step 4: Apply the one Tailwind 4 class rename that affects this code**

In v4, `outline-none` no longer hides the outline the way v3 did; `outline-hidden` is the v3 behaviour. In `lib/styles/dropdown.ts`, change `'focus:outline-none',` to `'focus:outline-hidden',`.

Run: `grep -rnE "outline-none|shadow-sm|rounded-sm|blur-sm" lib components app`
Expected: no output. The bare `rounded` used in `button.ts`, `card.ts` and `dropdown.ts` keeps its v3 size in v4.

- [ ] **Step 5: Remove the Biome override for the stylesheet**

In `biome.json`, delete the whole `"overrides"` array (and the comma before it).

Run: `npm run lint`
Expected: no errors. `app/globals.css` is now linted with Tailwind 4 directives understood.

- [ ] **Step 6: Run every check**

Run: `npm run typecheck && npm test && npm run build`
Expected: all pass. The `Prompt` snapshot is unchanged, because its class string is the same.

- [ ] **Step 7: Check the base path prefix**

Run: `NEXT_PUBLIC_BASE_PATH=/base npm run build && grep -o '/base/_next/static/[^"]*\.woff2' out/index.html | head -3 && grep -c 'href="/_next/' out/index.html`
Expected: at least one preloaded `.woff2` URL starting with `/base/_next/static/`, and the count of unprefixed `/_next/` hrefs is `0`.

Then rebuild without the prefix: `npm run build`.

- [ ] **Step 8: Compare the site with production in a browser**

Run: `npx -y serve@14 out -l 3000`, then open http://localhost:3000 next to the production site, at desktop width:
- In light mode and in dark mode, the header buttons, theme dropdown (open it), particle colours, footer links and footnote colours match.
- The headings render in Lausanne and the buttons in NB International Pro Mono. In devtools, check the computed `font-family` of a nav button and of the "coming soon" heading.
- Hovering a footer link turns it yellow.

Stop the server afterwards.

- [ ] **Step 9: Commit and push**

```bash
git add -A
git commit -F - <<'EOF'
build: move to tailwind 4 and next/font/local

Configure the restricted palette and font families in CSS with @theme,
switch PostCSS to @tailwindcss/postcss and drop autoprefixer. Load the
Lausanne and NB International Pro Mono fonts through next/font/local;
the icon font stays as plain CSS until the shadcn/ui story.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git push
```

---

### Task 5: Modernise the commit hooks and release tooling

**Files:**
- Modify: `package.json`, `package-lock.json`, `.husky/pre-commit`, `.husky/commit-msg`

**Interfaces:**
- Consumes: `npm run typecheck` and `.lintstagedrc.js` from earlier tasks.
- Produces: `npm run release`, run by `commit-and-tag-version`.

- [ ] **Step 1: Swap the packages**

```bash
npm uninstall standard-version commitlint
npm install -D husky@^9.1.7 lint-staged@^17.6.0 @commitlint/cli@^21.2.3 \
  @commitlint/config-conventional@^21.2.3 commit-and-tag-version@^13.2.1
npm pkg set scripts.prepare="husky" scripts.release="commit-and-tag-version"
```

- [ ] **Step 2: Rewrite the hooks in Husky 9's format, without the `husky.sh` line**

`.husky/pre-commit`:

```sh
npm run typecheck
npx lint-staged
```

`.husky/commit-msg`:

```sh
npx --no -- commitlint --edit "$1"
```

Run: `npm run prepare && git config core.hooksPath`
Expected: `.husky/_`.

- [ ] **Step 3: Check that commitlint rejects a bad message**

Run: `git commit --allow-empty -m "Add Something"`
Expected: the commit is refused with a `subject-case` error. Run `git log -1 --format=%s` to confirm the last commit is still Task 4's.

- [ ] **Step 4: Check that the release tool would produce the next version**

Run: `npx commit-and-tag-version --dry-run`
Expected: it prints a bump from `1.1.0` and a changelog section listing this branch's commits. Nothing is written or tagged.

- [ ] **Step 5: Run every check**

Run: `npm run lint && npm run typecheck && npm test && npm run build`
Expected: all pass.

- [ ] **Step 6: Commit and push**

```bash
git add -A
git commit -F - <<'EOF'
build: move to husky 9 and commit-and-tag-version

Replace the deprecated standard-version with its maintained fork, and
upgrade husky, lint-staged and commitlint to current versions.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git push
```

Expected: the commit goes through both new hooks.

---

### Task 6: Rewrite the README and CLAUDE.md for the new structure

**Files:**
- Modify: `README.md`, `CLAUDE.md`, `docs/specs/2026-10-08-repository-overhaul-design.md`

- [ ] **Step 1: Rewrite `README.md`**

````markdown
# van_esterik

Showcase website of [@vanesterik](https://github.com/vanesterik), built with Next.js and exported as a static site.

## Stack

- [Next.js](https://nextjs.org/) (App Router, static export) and React
- [Tailwind CSS](https://tailwindcss.com/)
- [Biome](https://biomejs.dev/) for linting and formatting
- [Vitest](https://vitest.dev/) and Testing Library for tests
- TypeScript

## Getting started

Requires Node 24 (see `.nvmrc`).

```bash
npm install
npm run dev
```

## Scripts

| Script | Does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Export the static site to `out/` |
| `npm run lint` | Check linting and formatting with Biome |
| `npm run format` | Apply Biome's fixes and formatting |
| `npm run typecheck` | Generate Next.js types and run `tsc` |
| `npm test` | Run the tests once |
| `npm run test:watch` | Run the tests in watch mode |
| `npm run coverage` | Run the tests with coverage |
| `npm run release` | Bump the version, update the changelog and tag |
````

- [ ] **Step 2: Rewrite `CLAUDE.md`**

````markdown
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

Releases use `commit-and-tag-version` (`npm run release`), which bumps the version, updates `CHANGELOG.md` and creates a `v*.*.*` tag. Pushing that tag deploys production, so releasing is Koen's call.

## Architecture

```
app/          App Router: layout.tsx (shell, fonts, theme provider), pages, not-found, globals.css, fonts/
components/   site components, tests next to each (*.test.tsx)
lib/          particles.ts (home page animation), styles/ (cva style functions), random.ts, repeat.ts
content/      layout.json: menu, theme options, contact, social links, copyright
```

Things that take more than one file to see:

- **The site is a static export** (`output: 'export'`, `trailingSlash: true`, optional `NEXT_PUBLIC_BASE_PATH`). Route handlers, server actions, middleware and the default image optimizer don't work.
- **Server components by default.** Only `theme-provider`, `theme-selector` and `particle-canvas` are client components.
- **Layout and content are data-driven.** `app/layout.tsx` builds the header, navigation, theme selector and footer from `content/layout.json`; pages render only their main content.
- **Styling** is Tailwind 4, configured in `app/globals.css` with `@theme`. The palette is restricted to `black`, `white`, `primary-*` (stone) and `secondary-*` (yellow); fonts to `sans` (Lausanne), `mono` (NB International Pro Mono) and `icon`. The text fonts load through `next/font/local` in `app/layout.tsx`.
- **`lib/styles/` holds `cva` style functions** carried over from the old `@vanesterik/ui` package. Story #34 replaces them with shadcn/ui; don't add new ones.
- **Dark mode is class-based.** `ThemeProvider` resolves light, dark or system preference and toggles `dark` on `<html>`; `@custom-variant dark` targets it.
- **Icons are glyphs of the icon font**, mapped in `lib/styles/icon.ts` through `before:content-['<char>']`. Story #34 replaces them with Lucide.
- **The `@/*` alias** resolves from the repository root, in Next.js through `tsconfig.json` and in Vitest through `vitest.config.ts`.

Component tests are Vitest with Testing Library and user-event in jsdom (`vitest.config.ts`, `vitest.setup.ts`).

## CI and deployment

All workflows install through the composite action `.github/actions/setup-node` (Node from `.nvmrc`, `npm ci`). Actions are pinned by commit SHA where Dependabot maintains them.

- **Continuous Integration** (push to `main`, pull requests): lint, typecheck, test, build.
- **Preview Environment** (pull requests to `main`): builds and syncs `out/` to a public S3 website bucket `preview-pr-<number>-vanesterik`, and caches the preview URL. Closing the pull request deletes the bucket.
- **Web Performance Audit** waits for the "Deploy Preview Environment" check, runs Lighthouse on `/`, `/about/`, `/projects/` and `/posts/`, and keeps a single score comment on the pull request up to date. A new top-level page should be added to its URL list.
- **Production Environment** (tag `v*.*.*`): builds and syncs `out/` to the production S3 bucket.
````

- [ ] **Step 3: Correct the spec's script list**

In `docs/specs/2026-10-08-repository-overhaul-design.md`, in story 1's npm scripts bullet, change `` `dev`, `build`, `start`, `lint` `` to `` `dev`, `build`, `lint` `` and add this sentence at the end of the bullet: "There is no `start` script, because `next start` doesn't serve a static export."

- [ ] **Step 4: Run every check**

Run: `npm run lint && npm run typecheck && npm test && npm run build`
Expected: all pass.

- [ ] **Step 5: Commit and push**

```bash
git add README.md CLAUDE.md docs/specs/2026-10-08-repository-overhaul-design.md
git commit -F - <<'EOF'
docs: describe the single npm app in readme and claude.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git push
```

- [ ] **Step 6: Mark the pull request ready for review**

Update the pull request #36 body to list all eight commits (spec, plan, Tasks 1 to 6) under "Review commit by commit", then run `gh pr ready 36`.

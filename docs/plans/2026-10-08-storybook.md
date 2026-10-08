# Add Storybook: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, in this session, on the branch `feat/storybook`. Subagents may review; they never implement (see `~/.claude/CLAUDE.md`). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- Clear up the minor issues deferred from story #34.
- Show a gear instead of a snowflake for the "system" theme.
- Add Storybook, so the shadcn/ui components and the theme selector can be browsed on their own in light and dark, with the site's real fonts and theme tokens.

This is story #35, the last story of epic #32.

**Architecture:** The work happens in five commits:

1. Clean up #34's deferred minors.
2. Use Lucide's gear (`Settings`) for the "system" theme option.
3. Set up Storybook 10 (`@storybook/nextjs-vite`) with the button stories. The fonts move from `app/layout.tsx` to `app/fonts.ts`, so the layout and Storybook load them the same way.
4. Add the dropdown menu and theme selector stories.
5. Make CI build Storybook, and update the docs.

**Tech stack:** Storybook 10.6 (`storybook`, `@storybook/nextjs-vite`, `@storybook/addon-themes`), on the stack from stories #33 and #34.

**Spec:** `docs/specs/2026-10-08-repository-overhaul-design.md`, "Story 3" (on `main`). Two tasks cover Koen's requests, which the spec doesn't:
- Task 1 includes #34's deferred minors.
- Task 2 replaces the "system" icon. The spec names Lucide's `Snowflake` for it; Koen asked for a gear instead.

## Global constraints

- **Stories:** they sit next to their components. Only `components/ui/button`, `components/ui/dropdown-menu` and `components/theme-selector` get stories; layout components get none.
- **Real tokens and fonts:** `.storybook/preview.ts` imports `app/globals.css`, and the theme toolbar toggles the `dark` class on `<html>`.
- **Scripts:** `npm run storybook` starts the dev server on port 6006, and `npm run build-storybook` builds it to `storybook-static/`, which is git-ignored.
- **Not deployed.** The CI workflow runs `build-storybook`. CI is disabled in this repository, so every check also runs locally before each commit.
- **Before each commit,** run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`, plus `npm run build-storybook` from Task 3 on.
- **Commit messages:** conventional commits with a lowercase subject, each ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Push each task commit as soon as it's made.

**Checked beforehand** in a scratch copy of `main`:
- Storybook 10.6 builds this project.
- With the fonts' classes added to `<html>` in `preview.ts`, stories render in NB International Pro Mono and use the token colours. A secondary button in dark mode gets the same stone-800 at 80% as on the site.
- `withThemeByClassName` toggles `dark`.
- The theme selector story works when its `next-themes` provider writes `data-theme` instead of the class, so the provider and the toolbar don't fight over `<html>`.
- `tsc` passes with `.storybook/*.ts` included.

**Additions beyond the spec:**
- **Telemetry off:** `core.disableTelemetry: true` keeps Storybook from sending usage data.
- **Centred stories:** stories use `layout: 'centered'`.

## Review focus

1. **Theme toolbar in Storybook:** switching between light and dark must restyle every story, including the dropdown menu's content, which renders in a portal outside the story root. Pinned in Task 4, step 4.
2. **Fonts in Storybook:** stories must use Lausanne and NB International Pro Mono, not the fallback fonts. The theme's font variables resolve on `<html>`, so wrapping a story in the font classes isn't enough. Pinned in Task 3, step 7.
3. **The site's fonts after moving them to `app/fonts.ts`:** the exported site must still preload and use both fonts. Pinned in Task 3, step 6.
4. **The theme selector story must not take over `<html>`:** its `next-themes` provider must not override the toolbar's class. Pinned in Task 4, step 4.
5. **Deleting unused menu parts (Task 1)** must not break the theme selector. Pinned by the existing selector tests in Task 1, step 4.

---

### Task 1: Clean up story #34's deferred minors

**Files:**
- Modify: `components/ui/dropdown-menu.tsx`, `components/ui/button.tsx`, `components/theme-provider.tsx`, `components/theme-provider.test.tsx`, `components/particle-canvas.tsx`, `vitest.setup.ts`, `CLAUDE.md`

**Interfaces:**
- Produces:
  - `@/components/ui/dropdown-menu` exports only `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuRadioGroup` and `DropdownMenuRadioItem`.
  - `@/components/theme-provider` exports `ThemeProvider` and `themeProviderProps`, and no longer re-exports `useTheme`. Import that from `next-themes`.
  - Both ui components import `cn` from `@/lib/utils`.

- [ ] **Step 1: Trim the dropdown menu to what the site uses**

Replace `components/ui/dropdown-menu.tsx` with the following. `DropdownMenuContent` and `DropdownMenuRadioItem` are unchanged from `main`. The removed parts referred to tokens and animations this site doesn't define, so they would have rendered unstyled.

```tsx
'use client'

import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui'
import type * as React from 'react'

import { cn } from '@/lib/utils'

function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...props}
    />
  )
}

function DropdownMenuContent({
  className,
  align = 'end',
  sideOffset = 2,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        align={align}
        className={cn(
          'z-50 w-32 overflow-hidden rounded outline-hidden',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return (
    <DropdownMenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      data-inset={inset}
      className={cn(
        "relative flex cursor-pointer select-none flex-row items-center gap-x-0.5 bg-secondary/80 px-2 font-mono font-normal text-secondary-foreground text-xs uppercase leading-8 outline-hidden hover:bg-accent active:bg-highlight active:text-highlight-foreground focus:bg-accent data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
}

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
}
```

- [ ] **Step 2: Make the imports consistent**

`components/ui/button.tsx`: change `import { cn } from 'cn'` to `import { cn } from '@/lib/utils'`, as `components.json` says ui components should.

`components/theme-provider.tsx`: delete the line `export { useTheme } from 'next-themes'`, and the blank line before it.

`components/particle-canvas.tsx`: change `import { useTheme } from './theme-provider'` to `import { useTheme } from 'next-themes'`, and move it up into the package imports, after `import { useEffect } from 'react'`.

`components/theme-provider.test.tsx`: change `import { ThemeProvider, themeProviderProps, useTheme } from './theme-provider'` to these two imports:

```tsx
import { useTheme } from 'next-themes'
```

```tsx
import { ThemeProvider, themeProviderProps } from './theme-provider'
```

The first goes with the package imports, the second where the old line was.

Run: `grep -rn "from 'cn'\|useTheme } from './theme-provider'" app components`
Expected: no output.

- [ ] **Step 3: Fix the stale comment and docs**

`vitest.setup.ts`: change `// jsdom has no ResizeObserver, which Headless UI uses to position its menus` to `// jsdom has no ResizeObserver, which Radix uses to position its menus`.

`CLAUDE.md`:
- Change ``Only `theme-provider`, `theme-selector` and `particle-canvas` are client components.`` to ``Only `theme-provider`, `theme-selector`, `particle-canvas` and the generated `components/ui/dropdown-menu` are client components.``
- Change ``(`background`, `foreground`, `primary`, `secondary`, `accent`, `highlight`, `muted-foreground` and their `-foreground` pairs)`` to ``(`background`, `foreground`, `primary`/`primary-foreground`, `secondary`/`secondary-foreground`, `accent`, `highlight`/`highlight-foreground` and `muted-foreground`)``.
- Change `lib/          particles.ts (home page animation), utils.ts (shadcn's cn), random.ts, repeat.ts` to `lib/          particles.ts (home page animation), utils.ts (shadcn's cn, used by components/ui), random.ts, repeat.ts`.

- [ ] **Step 4: Run every check**

Run: `npm run format && npm run lint && npm run typecheck && npm test && npm run build`
Expected: all pass, with 10 test files and 22 tests. The selector tests show that deleting the menu parts broke nothing.

- [ ] **Step 5: Commit and push**

```bash
git add -A
git commit -F - <<'EOF'
refactor: trim the generated menu and tidy imports

Keep only the dropdown menu parts the site uses; the others referred to
tokens and animations this site doesn't define. Import `cn` through
`@/lib/utils` and `useTheme` from next-themes everywhere, and correct a
stale comment and CLAUDE.md lines from the shadcn/ui story.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git push
```

---

### Task 2: Show a gear for the "system" theme

**Files:**
- Modify: `components/theme-selector.test.tsx`, `components/theme-selector.tsx`, `content/layout.json`

**Interfaces:**
- Produces: the theme option icon names `settings`, `moon` and `sun` (Lucide names). The "system" option in `content/layout.json` uses `settings`.

- [ ] **Step 1: Change the tests to expect the gear**

In `components/theme-selector.test.tsx`:
- In the `options` array, change `{ name: 'system', icon: 'snowflake' }` to `{ name: 'system', icon: 'settings' }`.
- In the `shows each option with its Lucide icon` test, change `['system', 'snowflake'],` to `['system', 'settings'],`.

- [ ] **Step 2: Run them and watch the icon test fail**

Run: `npx vitest run components/theme-selector.test.tsx`
Expected: `shows each option with its Lucide icon` fails: the "system" item has no `svg.lucide-settings`, because `settings` isn't in the selector's icon map yet. The other four tests pass.

- [ ] **Step 3: Map the gear and use it for "system"**

In `components/theme-selector.tsx`:
- Change `import { Moon, Snowflake, Sun } from 'lucide-react'` to `import { Moon, Settings, Sun } from 'lucide-react'`.
- Change `const icons = { moon: Moon, snowflake: Snowflake, sun: Sun }` to `const icons = { moon: Moon, settings: Settings, sun: Sun }`.

In `content/layout.json`, change the "system" theme option's `"icon": "snowflake"` to `"icon": "settings"`.

Run: `npx vitest run components/theme-selector.test.tsx && grep -rn "snowflake\|Snowflake" app components content`
Expected: 5 tests pass and the `grep` prints nothing.

- [ ] **Step 4: Run every check and look at the menu**

Run: `npm run lint && npm run typecheck && npm test && npm run build`
Expected: all pass, with 10 test files and 22 tests.

Serve `out/` with `npx -y serve@14 out -l 3124`, open the theme menu and check that "system" shows a gear. Stop the server.

- [ ] **Step 5: Commit and push**

```bash
git add -A
git commit -F - <<'EOF'
feat: show a gear for the system theme

Replace the snowflake on the "system" theme option with Lucide's
settings gear.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git push
```

---

### Task 3: Set up Storybook with the button stories

**Files:**
- Create: `app/fonts.ts`, `.storybook/main.ts`, `.storybook/preview.ts`, `components/ui/button.stories.tsx`
- Modify: `app/layout.tsx`, `tsconfig.json`, `.gitignore`, `package.json`, `package-lock.json`

**Interfaces:**
- Produces:
  - `app/fonts.ts` exports `lausanne` and `nbInternationalProMono`. These are `next/font/local` results; Task 4 doesn't use them directly.
  - Story ids `ui-button--default`, `ui-button--secondary`, `ui-button--ghost` and `ui-button--as-link`.
  - Storybook's preview applies `withThemeByClassName` with the themes `light` (no class) and `dark` (`dark`).

- [ ] **Step 1: Install Storybook**

```bash
npm install -D storybook@^10.6.1 @storybook/nextjs-vite@^10.6.1 @storybook/addon-themes@^10.6.1
npm pkg set scripts.storybook="storybook dev -p 6006" scripts.build-storybook="storybook build"
printf '\n# storybook\nstorybook-static\n' >> .gitignore
```

- [ ] **Step 2: Watch the Storybook build fail without a config**

Run: `npm run build-storybook`
Expected: it fails because there is no `.storybook/main.*` config. This is the red step for this task: the build is the test that the stories exist and compile.

- [ ] **Step 3: Move the fonts into their own module**

Storybook's preview needs the same fonts as the layout, so they move to `app/fonts.ts`:

```ts
import localFont from 'next/font/local'

export const lausanne = localFont({
  src: [
    { path: './fonts/twk_lausanne_400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/twk_lausanne_700.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-lausanne',
})

export const nbInternationalProMono = localFont({
  src: './fonts/nb_international_pro_mono.woff2',
  weight: '400',
  style: 'normal',
  display: 'swap',
  variable: '--font-nb-international-pro-mono',
})
```

In `app/layout.tsx`:
- Delete `import localFont from 'next/font/local'`.
- Delete both `const lausanne = localFont({...})` and `const nbInternationalProMono = localFont({...})` blocks.
- Add `import { lausanne, nbInternationalProMono } from './fonts'` as a separate group after the `@/` imports.

- [ ] **Step 4: Write the Storybook config**

`.storybook/main.ts`:

```ts
import type { StorybookConfig } from '@storybook/nextjs-vite'

const config: StorybookConfig = {
  stories: ['../components/**/*.stories.tsx'],
  addons: ['@storybook/addon-themes'],
  framework: '@storybook/nextjs-vite',
  staticDirs: ['../public'],
  core: {
    disableTelemetry: true,
  },
}

export default config
```

`.storybook/preview.ts`:

```ts
import '../app/globals.css'

import { withThemeByClassName } from '@storybook/addon-themes'
import type { Preview, ReactRenderer } from '@storybook/nextjs-vite'

import { lausanne, nbInternationalProMono } from '../app/fonts'

// The theme's font tokens resolve these variables on <html>, as the layout does
document.documentElement.classList.add(
  lausanne.variable,
  nbInternationalProMono.variable,
)

const preview: Preview = {
  decorators: [
    withThemeByClassName<ReactRenderer>({
      themes: { light: '', dark: 'dark' },
      defaultTheme: 'light',
    }),
  ],
  parameters: {
    layout: 'centered',
  },
}

export default preview
```

`components/ui/button.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Button } from './button'

const meta = {
  component: Button,
  args: { children: 'about' },
} satisfies Meta<typeof Button>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Secondary: Story = {
  args: { variant: 'secondary' },
}

export const Ghost: Story = {
  args: { variant: 'ghost' },
}

export const AsLink: Story = {
  args: {
    asChild: true,
    variant: 'secondary',
    children: <a href="/about">about</a>,
  },
}
```

Add `".storybook/*.ts"` to the `include` array in `tsconfig.json`, after `"**/*.tsx"`. TypeScript's `**` doesn't match directories starting with a dot.

- [ ] **Step 5: Build Storybook and check the stories are there**

Run: `npm run build-storybook && node -e "console.log(Object.keys(require('./storybook-static/index.json').entries).join('\n'))"`
Expected: the build succeeds and prints these four ids:
- `ui-button--default`
- `ui-button--secondary`
- `ui-button--ghost`
- `ui-button--as-link`

- [ ] **Step 6: Check the site still loads its fonts**

Run: `npm run build && grep -c 'twk_lausanne_400\|nb_international_pro_mono' out/index.html`
Expected: a count of at least `2`. Both fonts are still preloaded by the exported page.

- [ ] **Step 7: Check fonts and colours in a browser**

Run `npx -y serve@14 storybook-static -l 6106`. Then open http://localhost:6106/iframe?id=ui-button--secondary&globals=theme:dark&viewMode=story and run this in the console:

```js
(() => {
  const b = document.querySelector('#storybook-root button')
  const s = getComputedStyle(b)
  return {
    dark: document.documentElement.classList.contains('dark'),
    color: s.color,
    background: s.backgroundColor,
    font: s.fontFamily,
    height: s.height,
    loadedFonts: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family),
  }
})()
```

Expected:
- `dark: true`, colour `rgb(255, 255, 255)` and background `oklab(0.268 ... / 0.8)`, the same as the site's secondary button in dark mode.
- A height of `32px`.
- The first `font` family is the `next/font` name that also appears in `loadedFonts`.

Open the same story with `globals=theme:light`: the background becomes `oklab(0.923 ... / 0.8)` and the text black. Stop the server.

- [ ] **Step 8: Run every check**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run build-storybook`
Expected: all pass. If Biome reports formatting in the new files, run `npm run format` and check again.

- [ ] **Step 9: Commit and push**

```bash
git add -A
git commit -F - <<'EOF'
feat: add storybook with the button stories

Set up Storybook 10 with the Next.js Vite framework and the themes
addon, which toggles the `dark` class from the toolbar. The preview
loads the site's stylesheet and fonts, so stories use the real tokens;
the fonts move to app/fonts.ts so the layout and Storybook share them.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git push
```

---

### Task 4: Add the dropdown menu and theme selector stories

**Files:**
- Create: `components/ui/dropdown-menu.stories.tsx`, `components/theme-selector.stories.tsx`

**Interfaces:**
- Consumes: the dropdown menu parts from Task 1, `ThemeProvider` from `@/components/theme-provider`, `ThemeSelector`, and the Storybook setup from Task 3.
- Produces: story ids `ui-dropdown-menu--radio-group-with-icons` and `theme-selector--default`.

- [ ] **Step 1: Write the stories**

`components/ui/dropdown-menu.stories.tsx`. The menu is open by default, so the story shows the items without a click.

```tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Moon, Settings, Sun } from 'lucide-react'
import { useState } from 'react'

import { Button } from './button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from './dropdown-menu'

const RadioMenu = () => {
  const [value, setValue] = useState('dark')

  return (
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary">{value}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={value} onValueChange={setValue}>
          <DropdownMenuRadioItem value="system">
            <Settings />
            system
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon />
            dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light">
            <Sun />
            light
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const meta = {
  component: DropdownMenu,
} satisfies Meta<typeof DropdownMenu>

export default meta

type Story = StoryObj<typeof meta>

export const RadioGroupWithIcons: Story = {
  render: () => <RadioMenu />,
}
```

`components/theme-selector.stories.tsx`. Its provider writes `data-theme` instead of the `dark` class, so it doesn't take `<html>` over from the theme toolbar. It also uses its own storage key, so it doesn't share the site's stored choice.

```tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import layout from '@/content/layout.json'

import { ThemeProvider } from './theme-provider'
import { ThemeSelector } from './theme-selector'

const meta = {
  component: ThemeSelector,
  args: { options: layout.theme },
  decorators: [
    (Story) => (
      <ThemeProvider
        attribute="data-theme"
        defaultTheme="system"
        enableSystem
        storageKey="storybook-theme"
      >
        <Story />
      </ThemeProvider>
    ),
  ],
} satisfies Meta<typeof ThemeSelector>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
```

- [ ] **Step 2: Build Storybook and check the new ids**

Run: `npm run build-storybook && node -e "console.log(Object.keys(require('./storybook-static/index.json').entries).join('\n'))"`
Expected: the four button ids, plus `ui-dropdown-menu--radio-group-with-icons` and `theme-selector--default`.

- [ ] **Step 3: Run every check**

Run: `npm run format && npm run lint && npm run typecheck && npm test && npm run build`
Expected: all pass, with 10 test files and 22 tests.

- [ ] **Step 4: Check both stories in both themes**

Run `npx -y serve@14 storybook-static -l 6106`.

Open http://localhost:6106/iframe?id=ui-dropdown-menu--radio-group-with-icons&globals=theme:dark&viewMode=story and run:

```js
[...document.querySelectorAll('[role=menuitemradio]')].map((i) => `${i.textContent} ${i.querySelector('svg')?.getAttribute('class')} ${getComputedStyle(i).backgroundColor}`)
```

Expected: three items (`system`, `dark`, `light`) with `lucide-settings`, `lucide-moon` and `lucide-sun`, each on `oklab(0.268 ... / 0.8)`. The menu content renders in a portal outside `#storybook-root` and still gets the dark tokens. With `globals=theme:light`, the items are on `oklab(0.923 ... / 0.8)`.

Open http://localhost:6106/iframe?id=theme-selector--default&globals=theme:dark&viewMode=story and run:

```js
(() => ({
  htmlClassHasDark: document.documentElement.classList.contains('dark'),
  dataTheme: document.documentElement.getAttribute('data-theme'),
  button: document.querySelector('#storybook-root button').textContent,
}))()
```

Expected:
- `htmlClassHasDark: true`, set by the toolbar.
- `dataTheme` is set by the story's provider and doesn't remove the class.
- The button reads `system`.

Stop the server.

- [ ] **Step 5: Commit and push**

```bash
git add -A
git commit -F - <<'EOF'
feat: add the dropdown menu and theme selector stories

Show the dropdown menu open as a radio group with Lucide icons, and the
theme selector with the real theme options. The selector's provider
writes data-theme, so it leaves the dark class to the toolbar.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git push
```

---

### Task 5: Build Storybook in CI and document it

**Files:**
- Modify: `.github/workflows/continuous-integration.yml`, `CLAUDE.md`, `README.md`

- [ ] **Step 1: Build Storybook in the CI workflow**

In `.github/workflows/continuous-integration.yml`, add this step after the `Build application` step:

```yaml
      - name: Build Storybook
        run: npm run build-storybook
```

- [ ] **Step 2: Document Storybook**

In `CLAUDE.md`, in the `## Commands` code block, add these two lines after `npm run coverage`:

```
npm run storybook        # Storybook on http://localhost:6006
npm run build-storybook  # static Storybook in storybook-static/
```

In the `## Architecture` code block, add this line after the `content/` line:

```
.storybook/   Storybook config: preview.ts loads app/globals.css and app/fonts.ts, toolbar toggles the dark class
```

After the bullet starting `- **Icons are Lucide**`, add:

```markdown
- **Storybook** covers the shadcn/ui components and the theme selector, with stories next to each (`*.stories.tsx`). Its preview adds the fonts' variable classes to `<html>`, because the theme's font tokens resolve there; wrapping a story in them isn't enough. A story that needs `next-themes` must give its provider `attribute="data-theme"` and its own `storageKey`, so it doesn't fight the toolbar over the `dark` class.
```

In the `## CI and deployment` list, change ``- **Continuous Integration** (push to `main`, pull requests): lint, typecheck, test, build.`` to ``- **Continuous Integration** (push to `main`, pull requests): lint, typecheck, test, build, build Storybook.``

In `README.md`:
- Add `- [Storybook](https://storybook.js.org/) for browsing components` to the `## Stack` list, after the Vitest line.
- Add these rows to the scripts table, after the `npm run coverage` row:

```markdown
| `npm run storybook` | Start Storybook on port 6006 |
| `npm run build-storybook` | Build a static Storybook to `storybook-static/` |
```

- [ ] **Step 3: Run every check**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run build-storybook`
Expected: all pass.

- [ ] **Step 4: Commit and push**

```bash
git add .github/workflows/continuous-integration.yml CLAUDE.md README.md
git commit -F - <<'EOF'
ci: build storybook, and document it

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git push
```

- [ ] **Step 5: Mark the pull request ready for review**

Update the pull request body to list all six commits (the plan, then Tasks 1 to 5) under "Review commit by commit", together with what was verified and how. Then run `gh pr ready <number>`.

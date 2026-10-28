# Mermaid diagrams in posts: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, in this session, on the branch `feat/mermaid-diagrams`. Subagents may review; they never implement (see `~/.claude/CLAUDE.md`). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Draw ` ```mermaid ` fences in posts as inline SVG at build time, themed with the site's tokens, and publish "Letting Claude do my bookkeeping" with its diagram. This is story #88.

**Architecture:** Two tasks, one commit each:

1. A rehype plugin, `src/lib/rehype-mermaid.ts`, that turns each `mermaid` fence into a `<figure class="mermaid">` holding an accessible SVG from `beautiful-mermaid`; wired into `getPost` before Shiki, styled in `globals.css`, documented in `CLAUDE.md`.
2. The bookkeeping post, with the Mermaid diagram in place of its box-drawing one.

**Tech stack:**
- `beautiful-mermaid` 1.1.3, pinned exactly (no `^`)
- `hast-util-from-html` 2.0.3
- the existing unified 11 / `remark-rehype` 11 / `@shikijs/rehype` 4.5 pipeline

**Spec:** `docs/specs/2026-10-19-mermaid-diagrams-design.md` (this pull request's first commit).

**Spiked beforehand** in the scratchpad, with `beautiful-mermaid` 1.1.3:
- Renders synchronously (`renderMermaidSVG(text, options): string`); the bookkeeping diagram takes about 1 ms and is 646 × 645.
- Colors passed as `var(--…)` land on the root `<svg>`'s `style` and are mixed in the browser with `color-mix()`.
- `pie`, `gantt`, `mindmap` and a misspelled header throw `Invalid mermaid header: …`. A malformed line inside a valid diagram doesn't throw.
- `accTitle:` / `accDescr:` lines are ignored by the renderer (no output, no error).
- Straight double quotes are dropped from labels; curly quotes survive.
- Every diagram's `<style>` has one Google Fonts `@import`; class and ER diagrams have two.
- Ids: markers (`seq-arrow`, `seq-arrow-open`, `arrowhead`, `arrowhead-start`, `cls-*`) and one per node or participant (`id="A"`, `id="_start"`, `id="A--"`). References are `url(#…)` in attributes (`marker-end`, `marker-start`).

## Global constraints

- **Static export:** the diagram is in the built HTML. No `mermaid` or `beautiful-mermaid` code reaches the browser; `rehype-mermaid.ts` is only imported by `src/lib/posts.ts`.
- **No browser in the build,** no third-party request from the page (every `@import` removed).
- **Colors are tokens only:** `bg: 'var(--background)'`, `fg: 'var(--foreground)'`, `muted: 'var(--muted-foreground)'`, `transparent: true`.
- **Font:** `var(--font-sans)` from `globals.css`, not the renderer's.
- **Before each commit:** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Push one commit at a time and wait for CI.
- **Commit messages:** conventional, lowercase subject, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review focus

1. **Node ids colliding with the page:** a participant named `You` gets `id="You"`; a heading or a second diagram with the same name must not clash. Every id is prefixed (test: two diagrams, all ids distinct, each `url(#…)` points into its own SVG).
2. **`accTitle` with a colon or extra spaces** (`accTitle:   How: a flow`): the title is everything after the first `accTitle:`, trimmed (test in Task 1).
3. **A `mermaid` fence with a meta string or uppercase** (` ```Mermaid `): only the exact `language-mermaid` class is a diagram; anything else stays a code block (no test; noted for the reviewer).
4. **The diagram on a phone:** full size, scrolling inside the figure, the page not scrolling sideways (browser check in Task 2).
5. **Theme switch on an open page:** the SVG recolors without reload (browser check in Task 2).

---

### Task 1: Render `mermaid` fences as SVG at build time

**Files:**
- Create: `src/lib/rehype-mermaid.ts`, `src/lib/rehype-mermaid.test.ts`
- Create: `src/lib/__fixtures__/broken-diagram/broken-diagram.md`
- Modify: `src/lib/__fixtures__/posts/newer-post.md` (add a diagram), `src/lib/posts.ts`, `src/lib/posts.test.ts`, `src/app/globals.css`, `package.json`, `package-lock.json`, `CLAUDE.md`

**Interfaces:**
- Produces: `export const rehypeMermaid: () => (tree: Root) => void` (hast `Root`). Throws `Error` with a message without a file name; `getPost` prefixes `<slug>.md: `.

- [ ] **Step 1: Install** `npm install --save-exact beautiful-mermaid@1.1.3` and `npm install hast-util-from-html@^2.0.3`. Check `hast-util-from-html`'s current options with Context7 (`fromHtml(value, { fragment: true, space: 'svg' })` is expected).

- [ ] **Step 2: Write the failing tests** in `src/lib/rehype-mermaid.test.ts`. A helper `render(markdown: string): Promise<string>` runs `unified().use(remarkParse).use(remarkRehype).use(rehypeMermaid).use(rehypeShiki, {themes: {light: 'github-light', dark: 'github-dark'}, defaultColor: false})` and returns `toHtml` of the tree (Shiki's cold start needs the same `beforeAll` warm-up as `posts.test.ts`). With `diagram(title = 'A flow', body = 'A->>B: hi')` building ` ```mermaid\nsequenceDiagram\n  accTitle: ${title}\n  accDescr: A talks to B\n  ${body}\n``` `:
  - `draws a mermaid fence as an accessible SVG`: output contains `<figure class="mermaid"><svg`, `role="img"`, `<title id="mermaid-1-title">A flow</title>`, `<desc id="mermaid-1-desc">A talks to B</desc>`, `aria-labelledby="mermaid-1-title"`, `aria-describedby="mermaid-1-desc"`, and no `<pre`.
  - `colors it with the site's tokens, without fetching fonts`: contains `var(--background)`, `var(--foreground)`, `var(--muted-foreground)`; contains no `@import` and no `fonts.googleapis.com`. Same assertions for a `classDiagram` fence (`A <|-- B`, with an `accTitle`).
  - `gives every diagram its own ids`: two diagrams in one string; every `id="…"` in the output is unique; every `url(#x)` in the first `<svg>…</svg>` has its `x` among that SVG's ids, and the same for the second; ids start with `mermaid-1-` and `mermaid-2-`.
  - `keeps curly quotes in labels`: `body = 'A->>B: “Book Q3”'` → output contains `“Book Q3”`.
  - `takes everything after accTitle: as the title`: `title = '  How: a flow  '` → `<title id="mermaid-1-title">How: a flow</title>`.
  - `requires an accTitle`: a fence without `accTitle` rejects with `a mermaid diagram needs an "accTitle:" line`.
  - `fails on a diagram type it can't draw`: ` ```mermaid\npie\n  accTitle: x\n  "a": 1\n``` ` rejects with a message containing `Invalid mermaid header`.
  - `leaves other code blocks to Shiki`: a ` ```text ` fence still gives `<pre class="shiki`.

- [ ] **Step 3: Run** `npx vitest run src/lib/rehype-mermaid.test.ts`. Expected: FAIL, `rehype-mermaid` not found.

- [ ] **Step 4: Implement `rehypeMermaid` in `src/lib/rehype-mermaid.ts`.** Visit `pre` elements whose only element child is `code` with `className` including `language-mermaid` (walk `tree.children` recursively; no `unist-util-visit` dependency needed unless it's already a direct one). Per diagram, numbered from 1 within the tree:
  1. Split the code text into lines; the first line matching `/^\s*accTitle:(.*)$/` gives the title (trimmed), the first matching `accDescr:` the description; both lines are removed. No title → throw the message above.
  2. `renderMermaidSVG(rest, { bg, fg, muted, transparent: true })` with the constraint values (no `font`; the CSS sets it).
  3. Remove every `@import …;` and the generated `text { font-family: … }` rule from the string.
  4. `fromHtml(svg, { fragment: true, space: 'svg' })`, take the `svg` element.
  5. Prefix every `id` with `mermaid-<n>-`, then rewrite every string attribute value: `url(#id)` → `url(#mermaid-<n>-id)` and `href`/`xlinkHref` `#id` → `#mermaid-<n>-id`, for ids of that SVG only.
  6. Add `role: 'img'`, `ariaLabelledBy`, and `ariaDescribedBy` (only with a description); insert `<title id="mermaid-<n>-title">` and, if any, `<desc id="mermaid-<n>-desc">` as the SVG's first children.
  7. Replace the `pre` with `{ type: 'element', tagName: 'figure', properties: { className: ['mermaid'] }, children: [svg] }`.

- [ ] **Step 5: Run** `npx vitest run src/lib/rehype-mermaid.test.ts`. Expected: PASS.

- [ ] **Step 6: Wire it into `getPost`, test first.** Add to `src/lib/__fixtures__/posts/newer-post.md` a sequence diagram with `accTitle: A greeting`. Create `src/lib/__fixtures__/broken-diagram/broken-diagram.md` (valid front matter, a `mermaid` fence with no `accTitle`). In `posts.test.ts`:
  - `draws mermaid diagrams`: `getPost('newer-post', fixtures('posts'))` HTML contains `<figure class="mermaid">` and `<title id="mermaid-1-title">A greeting</title>`.
  - `names the file when a diagram is broken`: `getPost('broken-diagram', fixtures('broken-diagram'))` rejects with `broken-diagram.md: a mermaid diagram needs an "accTitle:" line`.

  Run them (FAIL), then in `posts.ts` add `.use(rehypeMermaid)` between `remarkRehype` and `rehypeShiki`, and wrap `processor.run` so an error rethrows as `` `${slug}.md: ${error.message}` ``. Run `npx vitest run src/lib/posts.test.ts`: PASS.

- [ ] **Step 7: Style it** in `src/app/globals.css`, inside `@utility prose` next to `pre`:
  - `figure.mermaid { overflow-x: auto; }` (prose already gives `figure` its block margins; no background)
  - `.mermaid svg { display: block; max-width: none; margin-inline: auto; }`
  - `.mermaid text { font-family: var(--font-sans); }`

- [ ] **Step 8: Document** in `CLAUDE.md`'s "Posts" paragraph: a ` ```mermaid ` fence is drawn at build time by `src/lib/rehype-mermaid.ts` (`beautiful-mermaid`, no browser) in the site's tokens and Lausanne, at full size and scrolling inside its figure on narrow screens; it needs an `accTitle:` line (and may have `accDescr:`); only flowchart, state, sequence, class, ER and XY chart diagrams work, another type fails the build, and a malformed line inside a diagram is dropped silently; use curly quotes in labels. Add `rehype-mermaid.ts` to the `src/lib/` line of the architecture block.

- [ ] **Step 9: Verify** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`: all pass.

- [ ] **Step 10: Commit and push**

```bash
git add package.json package-lock.json src/lib/rehype-mermaid.ts src/lib/rehype-mermaid.test.ts src/lib/posts.ts src/lib/posts.test.ts src/lib/__fixtures__ src/app/globals.css CLAUDE.md
git commit -m "feat: draw mermaid diagrams in posts at build time"
git push
```

That's 11 files with the lock file and fixtures, an integration task; the commit message says so.

### Task 2: Publish the bookkeeping post with its diagram

**Files:**
- Create: `content/posts/letting-claude-do-my-bookkeeping.md` (the untracked file, edited)

**Interfaces:**
- Consumes: Task 1's `mermaid` fences in posts.

- [ ] **Step 1: Replace the diagram.** In "How a booking flows", replace the ` ```text ` block (from `You             Claude Code` to the last `│◀──…┤` line) with the ` ```mermaid ` block from the spec's "The post" section, verbatim, curly quotes included. Nothing else in the post changes; the cheat sheet stays a `text` block.

- [ ] **Step 2: Build** `npm run build`. Expected: passes; `grep -c '<figure class="mermaid">' out/posts/letting-claude-do-my-bookkeeping/index.html` prints `1`, and `grep -c 'fonts.googleapis' out/posts/letting-claude-do-my-bookkeeping/index.html` prints `0`.

- [ ] **Step 3: Check in the browser** (`npx serve out`, `/posts/letting-claude-do-my-bookkeeping/`):
  - wide screen, light and dark: the diagram is centred in the column, in Lausanne, labels inside their boxes, colors the site's; switching the theme on the open page recolors it;
  - 375px wide: the diagram is full size and scrolls sideways inside its figure; the page doesn't scroll sideways;
  - the network tab shows no request for the diagram;
  - a screen reader name of "How a booking flows" on the SVG (accessibility tree).

- [ ] **Step 4: Verify** `npm run lint`, `npm run typecheck`, `npm test`: pass.

- [ ] **Step 5: Commit and push**

```bash
git add content/posts/letting-claude-do-my-bookkeeping.md
git commit -m "feat: publish letting claude do my bookkeeping"
git push
```

Then update the pull request's commit list and mark it ready for review.

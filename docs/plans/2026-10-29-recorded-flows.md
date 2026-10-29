# Recorded Flows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web project previews play a recorded flow, made by a Playwright script in this repository, instead of a still screenshot.

**Architecture:** `content/projects.json` gains `preview.video` and `preview.note`, checked by `getProjects()`; a Node-only check fails the build when a file a preview names is missing. `BrowserFrame` plays a video through a small client component, `PreviewVideo`, which waits for the reduced-motion preference before playing. A recording command (`npm run record -- <slug>`) drives a project's flow in Playwright's Chromium, records it and hands it to ffmpeg, which writes the MP4 and its first frame, the new screenshot.

**Tech Stack:** Next.js 16 (static export), React 19, Tailwind 4, Vitest + Testing Library, Playwright (`@playwright/test`, library API), ffmpeg (from mise, not npm), Node 24's TypeScript support.

**Spec:** `docs/specs/2026-10-29-recorded-flows-design.md`

## Global Constraints

- Viewport and video: 1440 × 900 CSS pixels, `recordVideo.size` 1440 × 900, Chromium only.
- Output: `public/projects/<slug>.mp4` (H.264, `yuv420p`, `+faststart`, no audio) and `public/projects/<slug>.jpg` (its first frame); about 30 seconds and 5 to 10 MB per video.
- `src/lib/projects.ts` stays safe in the browser: no `fs` or `path` in it.
- ffmpeg is called from `PATH`; when it's missing, the command says to install it with `mise use -g ffmpeg`.
- The LeasePlan note, verbatim: "Recorded in 2026; the site has changed since I worked on it."
- Sports Direct's `url` becomes `https://ie.sportsdirect.com/`.
- Recordings are never made in CI. A Sports Direct shoe is added to the bag, never checked out. Cookie banners get the least consent they offer.
- Commit subjects are lower case (commitlint), and each commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Push one commit at a time to the draft PR #117.

## Review Focus

- A preview with a video, opened from a deep link (`/projects/leaseplan/`): the static HTML and the first client render must agree (no hydration warning), and the video starts after hydration. Test in Task 3.
- `prefers-reduced-motion: reduce`: the video never calls `play()` and shows controls. Test in Task 3.
- A browser that refuses `play()` (iPhone Low Power Mode rejects the promise): no unhandled rejection; the poster stays. Test in Task 3.
- A typo in a preview path (`/projects/sports-direct.mp4` missing): the build fails naming the slug and the path, not a broken video at runtime. Test in Task 2.
- `npm run record` with an unknown slug, no ffmpeg, or CrossVision not running: a one-line message saying what to do, and a non-zero exit. Tested by hand in Tasks 4 and 6.

---

### Task 1: The plan

**Files:**
- Create: `docs/plans/2026-10-29-recorded-flows.md`

- [ ] **Step 1: Commit and push**

```bash
git add docs/plans/2026-10-29-recorded-flows.md
git commit -m "docs: plan recorded flows in web project previews"
git push
```

Add the commit to the PR body's list.

---

### Task 2: Check videos, notes and preview files

**Files:**
- Modify: `src/lib/projects.ts` (`Project['preview']`, `PREVIEW_FIELDS`, `readProject`)
- Test: `src/lib/projects.test.ts`
- Create: `src/lib/project-files.ts`
- Test: `src/lib/project-files.test.ts`
- Modify: `src/app/projects/projects-page.tsx`
- Modify: `CLAUDE.md` (Projects paragraph, Architecture's `src/lib/` list)

**Interfaces:**
- Produces: `Project['preview'].note?: string`; `checkProjectFiles(projects: Project[], publicDir: string): void` in `src/lib/project-files.ts`, throwing `content/projects.json: <slug>: "<path>" isn't in public/`.

- [ ] **Step 1: Write the failing tests in `src/lib/projects.test.ts`**

```ts
it('keeps a video with its screenshot, and a note', () => {
  const [result] = getProjects([
    project({
      preview: { image: '/a.jpg', video: '/a.mp4', note: 'Recorded in 2026.' },
    }),
  ])
  expect(result.preview).toMatchObject({
    image: '/a.jpg',
    video: '/a.mp4',
    note: 'Recorded in 2026.',
  })
})

it('fails a video without a screenshot for its poster', () => {
  expect(() =>
    getProjects([project({ preview: { video: '/a.mp4' } })]),
  ).toThrow('lorem: a video needs a screenshot, its poster')
})

it('fails a video in the terminal frame', () => {
  expect(() =>
    getProjects([
      project({
        type: 'cli',
        preview: { image: '/a.png', frame: 'terminal', video: '/a.mp4' },
      }),
    ]),
  ).toThrow('lorem: a video plays in the browser frame')
})
```

- [ ] **Step 2: Write the failing tests in `src/lib/project-files.test.ts`**

With a temporary directory (`fs.mkdtempSync(path.join(os.tmpdir(), 'public-'))`) holding `projects/a.jpg`:
- `checkProjectFiles` with a project whose `image` is `/projects/a.jpg` doesn't throw.
- With `video: '/projects/a.mp4'` (missing), it throws `content/projects.json: lorem: "/projects/a.mp4" isn't in public/`.
- `checkProjectFiles(getProjects(), path.join(process.cwd(), 'public'))` doesn't throw: the real content names only files that exist.

Use `getProjects([...])` with the same `project()` fixture shape as `projects.test.ts` to build the input.

- [ ] **Step 3: Run them and see them fail**

Run: `npx vitest run src/lib/projects.test.ts src/lib/project-files.test.ts`
Expected: FAIL (`note` is an unknown field; `project-files` doesn't exist).

- [ ] **Step 4: Implement**

- `src/lib/projects.ts`: add `note?: string` to `preview` and `'note'` to `PREVIEW_FIELDS`; read it with `readOptionalString`. Next to the existing preview checks, fail `'a video needs a screenshot, its poster'` when `video` is set without `image`, and `'a video plays in the browser frame'` when `video` is set with `frame: 'terminal'`.
- `src/lib/project-files.ts` (Node only): `checkProjectFiles(projects, publicDir)` checks `image` and `video` of each preview with `fs.existsSync(path.join(publicDir, file))`.
- `src/app/projects/projects-page.tsx`: get the projects once, call `checkProjectFiles(projects, path.join(process.cwd(), 'public'))`, then render `<ProjectIndex projects={projects} />`.

- [ ] **Step 5: Run the tests, typecheck and build**

Run: `npx vitest run src/lib && npm run typecheck && npm run build`
Expected: PASS; the build prerenders `/projects/` and every `/projects/<slug>/`.

- [ ] **Step 6: Document**

In `CLAUDE.md`'s Projects paragraph: `preview.video` (an MP4 in the browser frame, with `image` as its poster) and `preview.note` (a muted line under the preview); every `image` and `video` must exist under `public/`, checked by `src/lib/project-files.ts` (Node only) when the projects pages build. Add `project-files.ts` to the `src/lib/` list in Architecture. Drop "Recordings and videos (`preview.recording`, `preview.video`) aren't rendered yet" down to recordings only.

- [ ] **Step 7: Commit and push**

```bash
git add src/lib/projects.ts src/lib/projects.test.ts src/lib/project-files.ts src/lib/project-files.test.ts src/app/projects/projects-page.tsx CLAUDE.md
git commit -m "feat: check preview videos, notes and files"
git push
```

---

### Task 3: Play a video in the browser frame

**Files:**
- Create: `src/components/preview-video.tsx` (`'use client'`)
- Test: `src/components/preview-video.test.tsx`
- Modify: `src/components/browser-frame.tsx`, `src/components/browser-frame.test.tsx`
- Modify: `src/components/project-index.tsx` (`ProjectPreview`), `src/components/project-index.test.tsx`
- Modify: `CLAUDE.md` (client components list; Projects paragraph)

**Interfaces:**
- Consumes: `Project['preview'].video`, `.note` (Task 2).
- Produces: `PreviewVideo({ video, poster, alt }: { video: string; poster: string; alt: string })`; `BrowserFrame` gains `video?: string`.

- [ ] **Step 1: Write the failing tests in `src/components/preview-video.test.tsx`**

Stub `window.matchMedia` (returning `matches` for `(prefers-reduced-motion: reduce)` as each test needs, with `addEventListener`/`removeEventListener`), and `HTMLMediaElement.prototype.play` with `vi.fn().mockResolvedValue(undefined)`.

- `'plays muted, looping and inline, with the screenshot as its poster'`: the `<video>` (found by `container.querySelector('video')`) has `muted` (`.muted === true`), `loop`, `playsinline`, `poster="/projects/a.jpg"`, `src="/projects/a.mp4"`, `aria-label="Recording of lorem"`, the class `aspect-[16/10] w-full object-cover`, and `play` was called once.
- `'with reduced motion, waits for the visitor to start it'`: `matches: true` → `play` not called, the video has `controls`.
- `'keeps the poster when the browser refuses to play'`: `play` rejects (`mockRejectedValue(new DOMException('', 'NotAllowedError'))`) → no unhandled rejection (the test passes with Vitest's unhandled-rejection check), no `controls`.
- `'prefixes the video and poster with the base path'`: with `vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/vanesterik.dev')`, `src` and `poster` start with `/vanesterik.dev/projects/`.

- [ ] **Step 2: Write the failing tests for the frame and the row**

- `browser-frame.test.tsx`, `'plays a video in place of the screenshot'`: with `video="/projects/a.mp4"`, there's a `<video>` and no `img` role.
- `project-index.test.tsx`: add a fixture project with `preview: { image: '/projects/amet.jpg', video: '/projects/amet.mp4', note: 'Recorded in 2026.' }`; opening its row shows a `<video>` and the text `Recorded in 2026.` with the class `text-muted-foreground`. Stub `matchMedia` and `play` there too (a `beforeEach` in that describe).

- [ ] **Step 3: Run them and see them fail**

Run: `npx vitest run src/components/preview-video.test.tsx src/components/browser-frame.test.tsx src/components/project-index.test.tsx`
Expected: FAIL.

- [ ] **Step 4: Implement**

- `PreviewVideo`: the reduced-motion preference through `useSyncExternalStore`, subscribing to `matchMedia('(prefers-reduced-motion: reduce)')`, with the server snapshot `'unknown'` and the client one `'reduce'` or `'motion'`, so the static HTML and the first client render agree. Render `<video muted loop playsInline poster src aria-label={alt} controls={preference === 'reduce'} className="aspect-[16/10] w-full object-cover">` with both paths through `withBasePath`. In an effect on the preference, when `'motion'`, call `ref.current?.play()` and swallow its rejection (the poster stays). No `autoPlay` attribute: the effect decides.
- `BrowserFrame`: with `video`, render `<PreviewVideo video={video} poster={image} alt={alt} />` in place of the `<img>`.
- `ProjectPreview` in `project-index.tsx`: pass `preview.video` to `BrowserFrame`; when `preview.note` is set, wrap the preview in `<div className="flex flex-col gap-2">` with `<p className="font-sans text-muted-foreground text-xs">{note}</p>` under it. The video's `alt` is `Recording of <name>`; the screenshot's stays `Screenshot of <name>`.

- [ ] **Step 5: Run all tests, typecheck and lint**

Run: `npm test && npm run typecheck && npm run lint`
Expected: PASS, with no React warning in the output.

- [ ] **Step 6: Document**

`CLAUDE.md`: add `preview-video` to the client components; in the Projects paragraph, say a video plays muted, looping and inline, starts only after hydration and not under `prefers-reduced-motion` (then with controls), and exists only while its row is open (the Accordion unmounts closed content).

- [ ] **Step 7: Commit and push**

```bash
git add src/components/preview-video.tsx src/components/preview-video.test.tsx src/components/browser-frame.tsx src/components/browser-frame.test.tsx src/components/project-index.tsx src/components/project-index.test.tsx CLAUDE.md
git commit -m "feat: play a preview video in the browser frame"
git push
```

---

### Task 4: Record Sports Direct's flow

Eleven files: the recording command lands with its first caller and its output.

**Files:**
- Modify: `package.json`, `package-lock.json` (`@playwright/test` dev dependency; `"record": "node scripts/recordings/record.ts"`)
- Modify: `tsconfig.json` (`"allowImportingTsExtensions": true`, so the scripts import each other by their `.ts` names, as Node requires)
- Create: `scripts/recordings/record.ts`
- Test: `scripts/recordings/record.test.ts`
- Create: `scripts/recordings/sports-direct.ts`
- Create: `public/projects/sports-direct.mp4`, `public/projects/sports-direct.jpg`
- Delete: `public/projects/sportsdirect.jpg`
- Modify: `content/projects.json` (Sports Direct), `src/components/browser-frame.stories.tsx`, `CLAUDE.md`

**Interfaces:**
- Produces, in `scripts/recordings/record.ts`:
  - `type Flow = { start: string; check?: () => Promise<void>; play: (page: Page) => Promise<void> }`, the default export of each `scripts/recordings/<slug>.ts`; `run` awaits `check` before opening the browser.
  - `pause(page: Page, ms: number): Promise<void>` and `smoothScroll(page: Page, to: 'bottom' | 'top' | number, ms: number): Promise<void>`, shared by the flows.
  - `encodeArgs(raw: string, out: string, from: number, seconds: number): string[]` and `posterArgs(video: string, out: string): string[]`: ffmpeg's arguments.
  - Run as `node scripts/recordings/record.ts <slug>`; also exported: `run(slug: string): Promise<void>`.

- [ ] **Step 1: Install**

Run: `npm install --save-dev @playwright/test && npx playwright install chromium`
Expected: `@playwright/test` in `devDependencies`; Chromium downloaded.

- [ ] **Step 2: Write the failing tests in `scripts/recordings/record.test.ts`**

- `encodeArgs('raw.webm', 'out.mp4', 1.2, 30)` contains, in order, `-ss 1.2`, `-i raw.webm`, `-t 30`, `-an`, `-c:v libx264`, `-pix_fmt yuv420p`, `-movflags +faststart`, and ends with `out.mp4`; it includes `-y` (overwrite).
- `posterArgs('out.mp4', 'out.jpg')` takes one frame (`-frames:v 1`) from the start of `out.mp4` and ends with `out.jpg`.
- `run('nope')` rejects with a message starting `Unknown project "nope": record one of ` and listing `sports-direct`: the slugs of the `.ts` flow files beside it (not `record` or tests), so later flows join the list by existing.

- [ ] **Step 3: Run them and see them fail**

Run: `npx vitest run scripts/recordings/record.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 4: Implement `scripts/recordings/record.ts`**

`run(slug)`: check the slug against the flows beside it; await the flow's `check` when it has one; check `ffmpeg -version` runs (else `ffmpeg isn't installed: run mise use -g ffmpeg`); launch Chromium headless; create a context with `viewport` and `recordVideo: { dir: <a fresh os.tmpdir() folder>, size }` both 1440 × 900; note the time from the context's creation to the end of `page.goto(flow.start)` with the page settled (`waitUntil: 'networkidle'`) as `from`; `await flow.play(page)`; take `seconds` as the time from then to the flow's end; close the context (which writes the WebM); run ffmpeg with `encodeArgs(raw, public/projects/<slug>.mp4, from, seconds)` at `-crf 18 -preset slow`, then `posterArgs`. Print the output paths and the MP4's size. On any failure, print the message and exit 1. The `if (import.meta.main)` guard (Node 24) runs it with `process.argv[2]`.

`smoothScroll` scrolls in small steps over `ms` with `page.mouse.wheel`, so the site's own scroll handlers fire; `pause` is `page.waitForTimeout`.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run scripts/recordings/record.test.ts`
Expected: PASS.

- [ ] **Step 6: Write `scripts/recordings/sports-direct.ts`**

`start: 'https://ie.sportsdirect.com/'`. `play`: dismiss the cookie banner with its least-consent button, then the design's ten steps, about 30 seconds in all: scroll down and up the homepage; focus the search bar; type "Adidas" with a typing delay (`pressSequentially` with `delay`) and submit; scroll down the results; click a shoe card; click another color; click carousel thumbnails; click a size; click add to bag; click the basket icon, and pause on the bag. A challenge or block page fails the script with `Sports Direct challenged the automated browser`.

- [ ] **Step 7: Record**

Run: `npm run record -- sports-direct`
Expected: `public/projects/sports-direct.mp4` (about 30 s, 5 to 10 MB: check with `ffprobe -v error -show_entries format=duration,size public/projects/sports-direct.mp4`) and `public/projects/sports-direct.jpg`, showing the homepage.

- [ ] **Step 8: Checkpoint: Koen judges the sharpness**

Show Koen the video (open it, and the projects page in `npm run dev` once Step 9 is done). If he finds it too soft, change `run` to capture frames through Chromium's screencast (CDP `Page.startScreencast`) and encode those, record again, and show him again. Don't write the other flows before he's satisfied.

- [ ] **Step 9: Point the content at it**

`content/projects.json`, Sports Direct: `"url": "https://ie.sportsdirect.com/"`, `"preview": { "image": "/projects/sports-direct.jpg", "video": "/projects/sports-direct.mp4" }`. Delete `public/projects/sportsdirect.jpg`. `browser-frame.stories.tsx`: the default story's `image` becomes `/projects/sports-direct.jpg`, and add a `WithVideo` story with `video: '/projects/sports-direct.mp4'`.

- [ ] **Step 10: Check**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: PASS. Then in `npm run dev`, `/projects/sports-direct/` plays the video in the frame, under the address `ie.sportsdirect.com`, without a jump from the poster.

- [ ] **Step 11: Document**

`CLAUDE.md`: a short "Recordings" section: `npm run record -- <slug>` makes `public/projects/<slug>.mp4` and its first frame `<slug>.jpg`; the flows are in `scripts/recordings/<slug>.ts`; it needs ffmpeg (`mise use -g ffmpeg`) and Chromium (`npx playwright install chromium`), runs on a Mac and never in CI; commit the new files after looking at them.

- [ ] **Step 12: Commit and push**

```bash
git add package.json package-lock.json tsconfig.json scripts/recordings public/projects content/projects.json src/components/browser-frame.stories.tsx CLAUDE.md
git commit -m "feat: record sports direct's flow"
git push
```

The message body says it touches eleven files, because the recording command lands with its first caller.

---

### Task 5: Record LeasePlan's flow

**Files:**
- Create: `scripts/recordings/leaseplan.ts`
- Create: `public/projects/leaseplan.mp4`; replace `public/projects/leaseplan.jpg`
- Modify: `content/projects.json` (LeasePlan)

**Interfaces:**
- Consumes: `Flow`, `pause`, `smoothScroll` (Task 4).

- [ ] **Step 1: Write `scripts/recordings/leaseplan.ts`**

`start`: the project's `url`, `https://www.ayvens.com/nl-nl/zakelijk-leasen-showroom/`. `play`: dismiss the cookie banner with its least consent, then the design's nine steps in about 30 seconds: scroll down and up the homepage; click the first car card; scroll down and up its landing page; click the first edition card; drag the carousel so the car turns 360 degrees (`page.mouse` down, moves, up); click each color; scroll until the buy zone on the right is in view; drag the duration and mileage sliders; check and uncheck a few additional features, pausing on each price change.

- [ ] **Step 2: Record**

Run: `npm run record -- leaseplan`
Expected: `public/projects/leaseplan.mp4` (about 30 s) and a new `public/projects/leaseplan.jpg`. Watch it through: every step visible, the price changing.

- [ ] **Step 3: Point the content at it**

LeasePlan's `preview`: `{ "image": "/projects/leaseplan.jpg", "video": "/projects/leaseplan.mp4", "note": "Recorded in 2026; the site has changed since I worked on it." }`.

- [ ] **Step 4: Check**

Run: `npm test && npm run build`
Expected: PASS. In `npm run dev`, `/projects/leaseplan/` plays the video, with the note in muted grey under the frame.

- [ ] **Step 5: Commit and push**

```bash
git add scripts/recordings/leaseplan.ts public/projects/leaseplan.mp4 public/projects/leaseplan.jpg content/projects.json
git commit -m "feat: record leaseplan's flow"
git push
```

---

### Task 6: Record CrossVision's flow

**Files:**
- Create: `scripts/recordings/crossvision.ts`
- Create: `public/projects/crossvision.mp4`; replace `public/projects/crossvision.jpg`
- Modify: `content/projects.json` (CrossVision)

**Interfaces:**
- Consumes: `Flow`, `pause`, `smoothScroll` (Task 4).

- [ ] **Step 1: Start CrossVision**

In `/Users/vanesterik/Projects/provincie-utrecht/self-supervised-models`, run `task dev` in the background, and read its output for the front end's address (Vite's, 5173 by default).

- [ ] **Step 2: Write `scripts/recordings/crossvision.ts`**

`start`: the front end's address, `http://localhost:5173/` unless Step 1 showed another. Its `check` throws `CrossVision isn't running: start it with task dev in self-supervised-models` when a `fetch` of `start` is refused. `play`: the design's eleven steps in about 30 seconds: click the first run; hover the training loss points, then the recall and precision points; "Datasets"; the first dataset; scroll to the sample; show more tiles and scroll on; "Predictions"; the first prediction; scroll slowly through its annotations; "Settings"; click through the color palettes.

- [ ] **Step 3: Check the message without CrossVision**

Stop `task dev`, run `npm run record -- crossvision`.
Expected: `CrossVision isn't running: start it with task dev in self-supervised-models`, exit code 1. Start it again.

- [ ] **Step 4: Record**

Run: `npm run record -- crossvision`
Expected: `public/projects/crossvision.mp4` (about 30 s) and a new `public/projects/crossvision.jpg`. Stop `task dev`.

- [ ] **Step 5: Point the content at it**

CrossVision's `preview`: `{ "image": "/projects/crossvision.jpg", "video": "/projects/crossvision.mp4" }`.

- [ ] **Step 6: Check**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: PASS. In `npm run dev`, all three web rows play their videos; open each from a deep link too, with no hydration warning in the console. On a phone width (390px), the video fits the frame.

- [ ] **Step 7: Commit, push, and mark the PR ready**

```bash
git add scripts/recordings/crossvision.ts public/projects/crossvision.mp4 public/projects/crossvision.jpg content/projects.json
git commit -m "feat: record crossvision's flow"
git push
gh pr ready 117
```

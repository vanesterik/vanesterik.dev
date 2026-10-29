# Terminal Recordings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The zsh plugins' previews play an asciinema recording of a real run on Koen's Mac, made by `npm run record -- <slug>`, instead of a scripted session.

**Architecture:** `preview.recording` names a `.cast` in `public/projects/`, checked like the other preview files. `TerminalFrame` plays it through a client component, `TerminalRecording`, which holds an 80 × 16 placeholder and loads `asciinema-player` only when mounted. The recorder gains a second kind of flow: a terminal flow, typed into a throwaway zsh by `expect` inside `asciinema rec`.

**Tech Stack:** Next.js 16 (static export), React 19, Tailwind 4, Vitest + Testing Library, `asciinema-player` (npm), asciinema and `expect` (tools on the Mac), zap.

**Spec:** `docs/specs/2026-10-29-terminal-recordings-design.md`

## Global Constraints

- Terminal size: 80 columns by 16 rows, shared by the recorder and the player (`TERMINAL_SIZE`).
- Prompt `PROMPT='$ '`, `RPROMPT=''`; the throwaway setup sets `ZDOTDIR` and `XDG_DATA_HOME` only; `HOME`, `PATH` and git config stay Koen's.
- Idle time limit 3 seconds (raised from 1.5 during Task 4, so the pause on `less` survives).
- `src/lib/projects.ts` stays safe in the browser.
- `CLAUDE.md` stays generic: no project names, paths or per-flow details (those go in each flow's script).
- Commit subjects lower case; each commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Push one commit at a time to the draft PR #118.

## Review Focus

- A deep link to a plugin (`/projects/zsh-git-alias/`): the placeholder renders the same on the server and the client, and the player replaces it without a shift. Test in Task 3.
- `prefers-reduced-motion: reduce`: no autoplay; the last frame shows with a way to start. Test in Task 3.
- The player module failing to load (offline after the page): the placeholder stays; no unhandled rejection. Test in Task 3.
- A recording whose cast is missing or misnamed: the build fails naming slug and path. Test in Task 2.
- `npm run record` for a terminal flow without asciinema or expect: one line saying what to install, exit 1. Test in Task 4.

---

### Task 1: The plan

- [ ] Commit `docs/plans/2026-10-29-terminal-recordings.md` (`docs: plan terminal recordings in cli project previews`), push, add it to the PR's list.

---

### Task 2: Check recordings

**Files:** Modify `src/lib/projects.ts`, `src/lib/projects.test.ts`, `src/lib/project-files.ts`, `src/lib/project-files.test.ts`.

**Interfaces:** Produces: `checkProjectFiles` also checks `preview.recording`.

- [ ] **Step 1: Failing tests** in `projects.test.ts`: `'keeps a recording'` (a `cli` project with `preview: { recording: '/a.cast' }` keeps it); `'fails on a recording and a terminal session'` → `'lorem: a preview is a recording or a terminal session, not both'`; `'fails on a recording for a web project'` → `'lorem: a web project shows an image, not a recording'`. In `project-files.test.ts`: a missing `recording: '/projects/a.cast'` throws `content/projects.json: lorem: "/projects/a.cast" isn't in public/`.
- [ ] **Step 2:** Run `npx vitest run src/lib`; expect those to FAIL.
- [ ] **Step 3:** Add the two checks beside the existing preview checks; add `preview.recording` to the files `checkProjectFiles` checks.
- [ ] **Step 4:** Run `npx vitest run src/lib && npm run typecheck`; expect PASS.
- [ ] **Step 5:** Commit `feat: check preview recordings`, push.

---

### Task 3: Play a recording in the terminal frame

**Files:** `package.json`/`package-lock.json` (`asciinema-player`); create `src/components/terminal-recording.tsx` (`'use client'`) and its test; modify `src/components/terminal-frame.tsx` and its test, `src/components/project-index.tsx` (`ProjectFrame`), `src/app/globals.css` (the player's theme), `CLAUDE.md` (client components, Projects paragraph).

**Interfaces:**
- Produces: `TERMINAL_SIZE = { cols: 80, rows: 16 }` exported from `src/components/terminal-recording.tsx` (the recorder imports it); `TerminalRecording({ recording }: { recording: string })`; `TerminalFrame` accepts `{ name: string; recording: string }` as a third form.

- [ ] **Step 1: Install** `npm install asciinema-player`. Check with Context7 that its version reads asciicast v3 (asciinema 3's format) and how its `create(src, element, options)` is imported.
- [ ] **Step 2: Failing tests** in `terminal-recording.test.tsx`, mocking `asciinema-player` (`vi.mock`, `create` a `vi.fn()` returning `{ dispose: vi.fn() }`) and stubbing `matchMedia` as in `preview-video.test.tsx`:
  - `'holds an 80 by 16 placeholder before the player loads'`: the container has `aspect-ratio` set from `TERMINAL_SIZE` (a style or a class; assert the computed value the component writes) and no player inside on the first render.
  - `'loads the player looping and playing, at the recording size'`: after `waitFor`, `create` was called with the base-pathed cast, the container element, and options including `cols: 80, rows: 16, loop: true, autoPlay: true, fit: 'width'`, the site's theme name and `controls: false`.
  - `'with reduced motion, shows the last frame and waits'`: `autoPlay: false`, a `poster` showing the end, and `controls: true`.
  - `'keeps the placeholder when the player fails to load'`: the mocked import rejects; no unhandled rejection; the placeholder stays.
  - `'disposes the player when the row closes'`: unmount calls `dispose`.
    In `terminal-frame.test.tsx`: `'plays a recording under its title, with a loop label'`: "zsh — ipsum" and "loop" shown, the frame keeps the `dark` class, and a `TerminalRecording` placeholder is inside.
- [ ] **Step 3:** Run them; expect FAIL.
- [ ] **Step 4: Implement.** `TerminalRecording`: the reduced-motion preference through `useSyncExternalStore` (server snapshot `'unknown'`, as `PreviewVideo`); a `div` with the placeholder's aspect ratio for 80 × 16 cells in the frame's font (columns × 0.6em by rows × line height; the player fits it); in an effect once the preference is known, `import('asciinema-player')` and its CSS, `create(...)` into the div, `dispose` on cleanup, swallow a failed import. Under reduced motion `poster: 'npt:...'` at the end of the recording (find the player's way to show the last frame; if it has none, the cast's duration read from the cast is the fallback). `TerminalFrame`: the recording form renders the title with a right-aligned `loop` label in `text-muted-foreground`, and `TerminalRecording` in place of the lines. `globals.css`: `.asciinema-player-theme-site` maps `--term-color-foreground/background` and the 16 colors to the dark tokens (`foreground`, `secondary`, `muted-foreground`, `info`, `warning`, `success`, `danger`), and the player's font to the mono font at the frame's size. `ProjectFrame`: a `preview.recording` renders `<TerminalFrame name recording />`.
- [ ] **Step 5:** Run `npm test && npm run typecheck && npm run lint`; expect PASS, no React warnings.
- [ ] **Step 6: Document** in `CLAUDE.md`, generically: `terminal-recording` among the client components; in the Projects paragraph, a `preview.recording` plays an asciinema cast in the terminal frame (80 × 16, a placeholder of that size until the player loads, the player only loaded when its row opens, no autoplay under reduced motion).
- [ ] **Step 7:** Commit `feat: play a terminal recording in the terminal frame`, push.

---

### Task 4: Record zsh-git-alias

**Files:** modify `scripts/recordings/record.ts` and its test; create `scripts/recordings/zsh-git-alias.ts`, `public/projects/zsh-git-alias.cast`; modify `content/projects.json`, `src/components/terminal-frame.stories.tsx`, `CLAUDE.md` (Recordings, generically).

**Interfaces:**
- Consumes: `TERMINAL_SIZE` (Task 3).
- Produces, in `record.ts`: `type TerminalStep = { type: string; waitFor?: string; pause?: number; press?: string }` (flat: Biome rejects a `then` property); `type TerminalFlow = { kind: 'terminal'; plugin: string; steps: TerminalStep[] }`; a flow file's default export is a `Flow` or a `TerminalFlow`; `expectScript(steps: TerminalStep[], command: string): string`; `asciinemaArgs(cast: string, command: string): string[]`.

- [ ] **Step 1: Failing tests** in `record.test.ts`:
  - `asciinemaArgs('out.cast', 'expect run.exp')` includes `rec`, `--window-size` `80x16`, `--idle-time-limit` `3`, `--overwrite`, the command, and ends with `out.cast`.
  - `expectScript([{ type: 'gst' }, { type: 'glol', waitFor: '\\(END\\)', pause: 2500, press: 'q' }], 'zsh -i')` spawns the command, waits for the `$ ` prompt before each step, sends each step's characters one at a time with a delay, sends Enter, and for `glol` expects `(END)` or `:`, sleeps, sends `q`; it ends by waiting for the prompt and sending `exit`.
  - A terminal flow run without asciinema rejects with `asciinema isn't installed: run mise use -g asciinema`.
- [ ] **Step 2:** Run them; expect FAIL.
- [ ] **Step 3: Implement.** `run` dispatches on `kind`. For a terminal flow: check `asciinema` and `expect` run; make a temporary folder with `zdotdir/.zshrc` (`source "$XDG_DATA_HOME/zap/zap.zsh"`, `PROMPT='$ '`, `RPROMPT=''`, nothing else) and clone zap into `xdg/zap` (`git clone --depth 1 https://github.com/zap-zsh/zap`) off camera; write the expect script; run `asciinema rec` with `ZDOTDIR` and `XDG_DATA_HOME` set, writing `public/projects/<slug>.cast`; print its duration and size; delete the folder.
- [ ] **Step 4:** Run `npx vitest run scripts`; expect PASS.
- [ ] **Step 5: Write `scripts/recordings/zsh-git-alias.ts`**: `plugin: 'vanesterik/zsh-git-alias'`; steps `plug "vanesterik/zsh-git-alias"`, `alias`, `cd ~/Projects/vanesterik.dev`, `gst`, then `glol` waiting for `less` and pressing `q` after a pause. A doc comment says what it needs (the repository at that path, network for the clones).
- [ ] **Step 6: Record** `npm run record -- zsh-git-alias`; play it back with `asciinema play public/projects/zsh-git-alias.cast` and check: the install message, the alias list scrolling past, `gst`, `less` opening and closing, 15 to 30 seconds.
- [ ] **Step 7: Content.** zsh-git-alias's `preview` becomes `{ "recording": "/projects/zsh-git-alias.cast" }` (its scripted lines go). Add a `Recording` story to `terminal-frame.stories.tsx` with it.
- [ ] **Step 8:** Run `npm test && npm run typecheck && npm run lint && npm run build`; expect PASS. In `npm run dev`, `/projects/zsh-git-alias/` plays it in the dark frame without a shift, in light and dark, at 390px and wide.
- [ ] **Step 9: Document** in `CLAUDE.md`'s Recordings section, generically: a flow can be a terminal flow, recorded with asciinema at 80 × 16 in a throwaway zsh (`ZDOTDIR`, `XDG_DATA_HOME`), typed by `expect`; it needs asciinema (`mise use -g asciinema`).
- [ ] **Step 10:** Commit `feat: record zsh-git-alias in use` (about nine files: the recorder lands with its first caller), push.

---

### Task 5: Record zsh-venv-auto-switch

**Files:** create `scripts/recordings/zsh-venv-auto-switch.ts`, `public/projects/zsh-venv-auto-switch.cast`; modify `content/projects.json`.

- [ ] **Step 1: Write the flow**: `plugin: 'vanesterik/zsh-venv-auto-switch'`; steps `plug "vanesterik/zsh-venv-auto-switch"`, `cd ~/Projects/fartt`, `which python`, `cd ~`, `which python`. Its doc comment says it needs `~/Projects/fartt` with a `.venv`.
- [ ] **Step 2: Record** `npm run record -- zsh-venv-auto-switch`; check the `.venv` path, then `python not found`.
- [ ] **Step 3: Content.** Its `preview` becomes `{ "recording": "/projects/zsh-venv-auto-switch.cast" }`.
- [ ] **Step 4:** Run `npm test && npm run build`; expect PASS; check `/projects/zsh-venv-auto-switch/` in the dev server.
- [ ] **Step 5:** Commit `feat: record zsh-venv-auto-switch in use`, push, mark PR #118 ready after the final review.

# Terminal recordings in cli project previews

Status: approved in conversation on 2026-10-29, for story #116.

## Purpose

A cli project's preview on `/projects/` is a scripted terminal session: lines of text in a `TerminalFrame`, written by hand. It shows roughly what the tool prints, but nothing happens, and the output isn't real. The preview should instead play a recording of the tool in use, made with [asciinema](https://asciinema.org/): a real run of a shell on Koen's Mac, replayed as text in the terminal frame, looping.

Success means:
- opening the row of a zsh plugin plays its recording in the dark terminal frame, as sharp and selectable text in the site's mono font;
- opening the row doesn't shift the page while the player loads;
- each recording can be made again by running one command.

## Scope

The two zsh plugins, both `cli` projects: zsh-git-alias and zsh-venv-auto-switch.

Not now:
- Fartt: it's changing soon (Koen's call), and keeps its scripted session.
- froopyland: it's changing soon too, and keeps its screenshot.
- schwifty and hamurai: they're added to the site by #86; their recordings follow then. _My call_

## The recordings

Each is a real run on Koen's Mac (Koen's choice): the outputs are whatever the commands print at the time, not text written for the recording. Each runs in a throwaway zsh setup (Koen's choice), so the plugin really installs on camera and Koen's own shell setup is never touched. The prompt is a plain `$ ` (Koen's choice), as in today's static previews.

### zsh-git-alias

1. zap installs the plugin.
2. All its aliases are listed. The list scrolls past the window; that's the point.
3. `gst` in `/Users/vanesterik/Projects/vanesterik.dev`.
4. `glol` in the same repository. git opens its log in `less`, as it does in Koen's terminal (Koen's choice): the first page shows, the script pauses on it, then presses `q`.

### zsh-venv-auto-switch

1. zap installs the plugin.
2. `cd ~/Projects/fartt`
3. `which python`, which shows the project's `.venv` Python (`/Users/vanesterik/Projects/fartt/.venv/bin/python`).
4. `cd ~`
5. `which python`, which prints `python not found`: outside a venv the Mac has only `python3` (Koen's choice to keep that).

## Decisions

| Topic                | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tool                 | asciinema (from the story): `asciinema rec` writes a `.cast` file of text and timings; [`asciinema-player`](https://www.npmjs.com/package/asciinema-player) replays it in the page as text. asciinema is a tool on the Mac (`mise use -g asciinema`, or Homebrew), not an npm dependency. The player must read the cast format the installed asciinema writes (asciinema 3 writes format v3)                                                                                                                                                                                                                       |
| The throwaway setup  | A temporary folder per run holds a `.zshrc` (`ZDOTDIR`) and zap's data (`XDG_DATA_HOME`, which zap reads for its install folder). zap itself is installed into it before recording starts, off camera. The `.zshrc` sources zap, sets `PROMPT='$ '` and no right prompt, and loads nothing else: no history, no other plugins, no theme. `HOME` stays Koen's, so `~/Projects/fartt` and `cd ~` are his real folders, and so do his `PATH` and git config: the run is his Mac as it is. The folder is deleted afterwards. _My call_ (how)                                                                           |
| Installing on camera | The recording's first command is zap's `plug "vanesterik/<plugin>"`, typed at the prompt: zap clones the plugin and loads it, and its own message shows. _My call_                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Typing               | A script drives the shell inside `asciinema rec`: it types each command one character at a time at a human pace, presses Enter, and waits for the prompt to return before the next. A step can also wait for something else and press a key: `glol` waits for `less` and presses `q`. Waits longer than 3 seconds are cut down (`asciinema rec`'s idle time limit), so a slow clone doesn't drag while deliberate pauses stay. _My call, after the first recordings: 1.5 seconds cut the pause on `less`_ How the keystrokes are sent is the builder's call (`expect`, which comes with macOS, or a pty from Node) |
| Terminal size        | Every recording is 80 columns by 16 rows (Koen's choice), so the frame is about as tall as the web previews' 16:10 frame, about 400px. 80 columns is about the width of the 640px column in the frame's mono font; the player scales to fit, and its size is known before the recording loads (see Placeholder)                                                                                                                                                                                                                                                                                                    |
| Length               | Each recording runs as long as its steps take at a calm pace, with a short pause on the last output before it loops. About 15 to 30 seconds. _My call_                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| The command          | The recordings use the same command as the web flows: `npm run record -- <slug>`. A terminal flow is a second kind of flow in `scripts/recordings/<slug>.ts` (its steps, and the plugin to install), and `record.ts` runs it with asciinema instead of Playwright. The result is `public/projects/<slug>.cast`. A missing asciinema says how to install it, in one line, like a missing ffmpeg. _My call_                                                                                                                                                                                                          |
| Content              | `preview.recording` (already accepted by `src/lib/projects.ts`) names the cast, such as `"/projects/zsh-git-alias.cast"`. A recording replaces the scripted session: a preview has `recording` or `terminal`, not both, and a web project can't have a recording. The two zsh plugins' scripted sessions are removed from `content/projects.json`                                                                                                                                                                                                                                                                  |
| Missing files        | `checkProjectFiles` (`src/lib/project-files.ts`) checks `preview.recording` too, so a missing cast fails the build, named by the slug                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| The frame            | A recording plays in the `TerminalFrame` as a session does today: dark in both themes, under its "zsh — <name>" title, which gains a "loop" label on the right in the muted color. The player gets the frame's look: the mono font at the frame's size, the dark theme's background and foreground, its colors mapped to the tokens (`info`, `warning`, `success`, `danger`, `muted-foreground`), no player chrome over the text except what reduced motion needs                                                                                                                                                  |
| Placeholder          | Until the player has loaded, the frame shows an empty dark terminal of exactly the player's size: 80 by 16 cells in the frame's font, as an aspect ratio. The player fits that box, so opening a row and loading the player shift nothing. On a phone the box and the text scale down together (the player fits the width)                                                                                                                                                                                                                                                                                         |
| Playback             | The player loops and starts by itself once loaded, except under `prefers-reduced-motion: reduce`, where it shows the recording's last frame (the first is an empty prompt) and a way to start it. _My call_ (the last frame) Like `PreviewVideo`, the preference is read after hydration (`useSyncExternalStore`), so a deep link renders the same placeholder on the server and the client                                                                                                                                                                                                                        |
| Loading              | The player is a client component, `TerminalRecording`, which loads `asciinema-player` (and its CSS) with a dynamic import when it mounts. The Accordion only mounts an open row's content, so neither the player nor the cast loads before its row opens                                                                                                                                                                                                                                                                                                                                                           |
| Storybook            | A `TerminalFrame` story with a recording                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Documentation        | `CLAUDE.md`, generically: terminal flows beside the web flows in the Recordings section (asciinema, the throwaway setup, the size), `preview.recording`, and `TerminalRecording` among the client components                                                                                                                                                                                                                                                                                                                                                                                                       |

## Left to the builder

- How the keystrokes reach the shell, and how the script knows the prompt is back.
- The typing pace and the pauses between steps, within a calm 15 to 30 seconds.
- How the player's colors and font are set (its theme options or CSS on its classes), as long as it reads like today's sessions.
- How the placeholder's aspect ratio is worked out from 80 × 16 and the font's metrics, as long as nothing shifts.

## Risks

- The outputs are real, so they change: `gst` shows the repository's state at the moment of recording, `glol` its latest commits, and `which python` whatever Koen's Mac has.
- zap and the plugins are cloned from GitHub during the recording, so it needs the network, and a slow clone shows as a pause (trimmed to the idle limit).
- `asciinema-player` adds JavaScript to the projects page, but only once a row with a recording opens.

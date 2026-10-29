import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { chromium, type Locator, type Page } from '@playwright/test'

import { TERMINAL_SIZE } from '../../src/lib/terminal-size.ts'

/**
 * Records a web project's flow for its preview on /projects/: runs
 * scripts/recordings/<slug>.ts in Chromium, records it, and has ffmpeg write
 * public/projects/<slug>.mp4 and its first frame, public/projects/<slug>.jpg.
 * Run on a Mac, never in CI: npm run record -- <slug>, or with a visible
 * window: HEADED=1 npm run record -- <slug>
 */

// A flow: the page it starts on, an optional check before the browser opens
// (that a local app is running), what to do before the video starts (such as
// a cookie banner, so the first frame, the new screenshot, is clean), and the
// steps it clicks through. The first page counts as open once the network is
// quiet, or for a site that never goes quiet (trackers, recommendations),
// once it has loaded: `waitUntil: 'load'`, and the flow waits for what it needs
export type Flow = {
  start: string
  waitUntil?: 'load' | 'networkidle'
  check?: () => Promise<void>
  prepare?: (page: Page) => Promise<void>
  play: (page: Page) => Promise<void>
}

// A terminal flow: a zsh plugin, installed with zap in a throwaway zsh, and
// the commands typed after it. A step can wait for something else than the
// prompt (a regular expression), such as a pager, pause on it, and press a key
export type TerminalStep = {
  type: string
  waitFor?: string
  pause?: number
  press?: string
}

export type TerminalFlow = {
  kind: 'terminal'
  plugin: string
  steps: TerminalStep[]
}

// The window and the video: 16:10, the browser frame's shape, and wide enough
// to stay sharp in a preview at most about 800 CSS pixels wide
const SIZE = { width: 1440, height: 900 }

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..', '..')

export const pause = (page: Page, ms: number) => page.waitForTimeout(ms)

/**
 * Scroll to the top, the bottom, a position, or an element (its top with room
 * above it, or with `end`, its bottom at the window's), eased over the given time, as a visitor's scroll would. It scrolls
 * whatever scrolls the page: the window, or an app's own scrolling element
 * (such as a main with overflow: auto) when the window doesn't
 */
export const smoothScroll = async (
  page: Page,
  to: 'top' | 'bottom' | number | Locator,
  ms: number,
  block: 'start' | 'end' = 'start',
) => {
  const element = typeof to === 'object' ? await to.elementHandle() : null
  await page.evaluate(
    ([to, element, ms, block]) =>
      new Promise<void>((resolve) => {
        const root = document.scrollingElement ?? document.documentElement
        const scroller =
          root.scrollHeight > root.clientHeight
            ? root
            : ([...document.querySelectorAll<HTMLElement>('*')]
                .filter(
                  (item) =>
                    item.scrollHeight > item.clientHeight &&
                    /auto|scroll/.test(getComputedStyle(item).overflowY),
                )
                .sort((a, b) => b.clientHeight - a.clientHeight)[0] ?? root)
        const top = scroller === root ? 0 : scroller.getBoundingClientRect().top
        const from = scroller.scrollTop
        const box = element?.getBoundingClientRect()
        const end = box
          ? block === 'end'
            ? box.bottom - top + from - scroller.clientHeight + 40
            : box.top - top + from - 80
          : to === 'top'
            ? 0
            : to === 'bottom'
              ? scroller.scrollHeight - scroller.clientHeight
              : Number(to)
        const started = performance.now()
        const step = (now: number) => {
          const t = Math.min((now - started) / ms, 1)
          const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
          scroller.scrollTop = from + (end - from) * eased
          if (t < 1) requestAnimationFrame(step)
          else resolve()
        }
        requestAnimationFrame(step)
      }),
    [typeof to === 'object' ? null : to, element, ms, block] as const,
  )
}

/**
 * ffmpeg's arguments for the MP4: the raw recording from `from` seconds, for
 * `seconds`, as H.264 every browser plays, without sound, sharp enough for
 * text, its index up front so it starts playing before it's all loaded
 */
export const encodeArgs = (
  raw: string,
  out: string,
  from: number,
  seconds: number,
) => [
  '-y',
  '-ss',
  String(from),
  '-i',
  raw,
  '-t',
  String(seconds),
  '-an',
  '-c:v',
  'libx264',
  '-crf',
  '18',
  '-preset',
  'slow',
  '-pix_fmt',
  'yuv420p',
  '-movflags',
  '+faststart',
  out,
]

// ffmpeg's arguments for the screenshot: the video's first frame
export const posterArgs = (video: string, out: string) => [
  '-y',
  '-i',
  video,
  '-frames:v',
  '1',
  '-q:v',
  '2',
  out,
]

/**
 * Why the flow's first page didn't open, in one line: a site that refuses the
 * headless browser drops the connection, a page that keeps loading times out,
 * and anything else is named by Chromium's error
 */
export const openingError = (start: string, error: Error) => {
  const code = /net::(ERR_[A-Z0-9_]+)/.exec(error.message)?.[1]
  if (code && /HTTP2_PROTOCOL|CONNECTION_(RESET|CLOSED|REFUSED)/.test(code)) {
    return `${start} refused the browser (${code})`
  }
  if (error.name === 'TimeoutError') {
    return `${start} didn't finish loading within 30 seconds`
  }
  return `Couldn't open ${start} (${code ?? error.message.split('\n')[0]})`
}

/**
 * asciinema's arguments: the shell recorded in a terminal of the recordings'
 * size, with waits longer than three seconds (a slow clone) cut short
 */
export const asciinemaArgs = (cast: string, command: string) => [
  'rec',
  '--window-size',
  `${TERMINAL_SIZE.cols}x${TERMINAL_SIZE.rows}`,
  '--idle-time-limit',
  '3',
  '--overwrite',
  '--quiet',
  '--command',
  command,
  cast,
]

// Typing pace and pauses, in milliseconds
const KEY = 90
const BEFORE = 1200
const AFTER = 2500

// One character as expect sends it, by its code, so quotes, braces and
// dollars need no escaping
const key = (character: string) =>
  `send -- [format %c ${character.codePointAt(0)}]\nafter ${KEY}`

/**
 * An expect script that starts the recording in a terminal of the
 * recordings' size and types the steps into the shell: each once the prompt
 * is back, a character at a time, then Enter; and ends the shell after the
 * last
 */
export const expectScript = (steps: TerminalStep[], command: string[]) => {
  // The prompt, and the control codes zsh writes after it
  const prompt = 'expect -re {\\$ (\\x1b\\[[0-9;?]*[A-Za-z])*$}'
  const lines = [
    'set timeout 30',
    `set stty_init "rows ${TERMINAL_SIZE.rows} columns ${TERMINAL_SIZE.cols}"`,
    `spawn ${command.map((part) => `{${part}}`).join(' ')}`,
  ]
  for (const step of steps) {
    lines.push(prompt, `after ${BEFORE}`)
    lines.push(...[...step.type].map(key))
    lines.push('send -- "\\r"')
    if (step.waitFor) {
      lines.push(
        `expect -re {${step.waitFor}}`,
        `after ${step.pause ?? 0}`,
        ...[...(step.press ?? '')].map(key),
      )
    }
  }
  // Ctrl-D ends the shell without typing exit into the last frame
  lines.push(prompt, `after ${AFTER}`, 'send -- "\\x04"', 'expect eof')
  return `${lines.join('\n')}\n`
}

// The projects with a flow: the scripts beside this one
const flows = () =>
  fs
    .readdirSync(here)
    .filter((file) => file.endsWith('.ts') && !file.includes('.test.'))
    .map((file) => file.replace(/\.ts$/, ''))
    .filter((slug) => slug !== 'record')
    .sort()

const ffmpeg = (args: string[]) => {
  try {
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args])
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error("ffmpeg isn't installed: run mise use -g ffmpeg")
    }
    throw error
  }
}

// A tool on the Mac, or a one-line message saying how to install it
const tool = (name: string, args: string[], install: string) => {
  try {
    execFileSync(name, args, { stdio: 'ignore' })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`${name} isn't installed: run ${install}`)
    }
    throw error
  }
}

// How long a cast plays: asciicast v3 events are intervals after its header
const castSeconds = (cast: string) =>
  fs
    .readFileSync(cast, 'utf8')
    .trim()
    .split('\n')
    .slice(1)
    .filter((line) => line.startsWith('['))
    .reduce((total, line) => total + Number(JSON.parse(line)[0]), 0)

/**
 * Record a terminal flow: a throwaway zsh (its own .zshrc and zap folder,
 * with Koen's HOME, PATH and git config), zap installed into it off camera,
 * and the steps typed into it by expect inside asciinema
 */
const recordTerminal = async (slug: string, flow: TerminalFlow) => {
  tool('asciinema', ['--version'], 'brew install asciinema')
  tool('expect', ['-v'], 'brew install expect')

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `record-${slug}-`))
  try {
    const zdotdir = path.join(dir, 'zdotdir')
    const xdg = path.join(dir, 'xdg')
    fs.mkdirSync(zdotdir)
    fs.mkdirSync(xdg)
    execFileSync('git', [
      'clone',
      '--quiet',
      '--depth',
      '1',
      'https://github.com/zap-zsh/zap',
      path.join(xdg, 'zap'),
    ])
    fs.writeFileSync(
      path.join(zdotdir, '.zshrc'),
      [
        // Completion, as any zsh has, which plugins register with
        'autoload -Uz compinit && compinit -u -d "$ZDOTDIR/.zcompdump"',
        'source "$XDG_DATA_HOME/zap/zap.zsh"',
        "PROMPT='$ '",
        "RPROMPT=''",
        // No inverted % before a prompt that follows output without a newline
        'unsetopt PROMPT_SP',
        '',
      ].join('\n'),
    )

    // Written outside the repository, then copied in, so a step that shows
    // the repository's state (git status) doesn't show the recording itself
    const recorded = path.join(dir, `${slug}.cast`)
    const cast = path.join(root, 'public', 'projects', `${slug}.cast`)
    const script = path.join(dir, 'record.exp')
    fs.writeFileSync(
      script,
      expectScript(flow.steps, [
        'asciinema',
        ...asciinemaArgs(recorded, 'zsh -i'),
      ]),
    )
    execFileSync('expect', [script], {
      env: {
        ...process.env,
        ZDOTDIR: zdotdir,
        XDG_DATA_HOME: xdg,
        TERM: 'xterm-256color',
      },
      stdio: 'ignore',
    })
    fs.copyFileSync(recorded, cast)

    const kilobytes = (fs.statSync(cast).size / 1e3).toFixed(0)
    console.log(
      `${path.relative(root, cast)} (${castSeconds(cast).toFixed(1)} s, ${kilobytes} kB)`,
    )
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

export const run = async (slug: string) => {
  const slugs = flows()
  if (!slugs.includes(slug)) {
    throw new Error(
      `Unknown project "${slug}": record one of ${slugs.join(', ')}`,
    )
  }
  const flow: Flow | TerminalFlow = (
    await import(pathToFileURL(path.join(here, `${slug}.ts`)).href)
  ).default
  if ('kind' in flow) return recordTerminal(slug, flow)
  await flow.check?.()
  ffmpeg(['-version'])

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `record-${slug}-`))
  // HEADED=1 opens a visible window, for a site that refuses a headless one
  const browser = await chromium.launch({ headless: !process.env.HEADED })
  const context = await browser.newContext({
    viewport: SIZE,
    recordVideo: { dir, size: SIZE },
  })
  try {
    const page = await context.newPage()
    const opened = Date.now()
    await page
      .goto(flow.start, { waitUntil: flow.waitUntil ?? 'networkidle' })
      .catch((error: Error) => {
        throw new Error(openingError(flow.start, error))
      })
    await flow.prepare?.(page)
    const started = Date.now()
    await flow.play(page)
    const ended = Date.now()
    await context.close()
    const raw = await page.video()?.path()
    if (!raw) throw new Error('Playwright wrote no video')

    const video = path.join(root, 'public', 'projects', `${slug}.mp4`)
    const poster = path.join(root, 'public', 'projects', `${slug}.jpg`)
    ffmpeg(
      encodeArgs(
        raw,
        video,
        (started - opened) / 1000,
        (ended - started) / 1000,
      ),
    )
    ffmpeg(posterArgs(video, poster))
    const megabytes = (fs.statSync(video).size / 1e6).toFixed(1)
    console.log(
      `${path.relative(root, video)} (${((ended - started) / 1000).toFixed(1)} s, ${megabytes} MB) and ${path.relative(root, poster)}`,
    )
  } finally {
    await context.close()
    await browser.close()
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run(process.argv[2] ?? '').catch((error: Error) => {
    console.error(error.message)
    process.exit(1)
  })
}

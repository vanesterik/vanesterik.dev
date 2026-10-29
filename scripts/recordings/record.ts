import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { chromium, type Locator, type Page } from '@playwright/test'

/**
 * Records a web project's flow for its preview on /projects/: runs
 * scripts/recordings/<slug>.ts in Chromium, records it, and has ffmpeg write
 * public/projects/<slug>.mp4 and its first frame, public/projects/<slug>.jpg.
 * Run on a Mac, never in CI: npm run record -- <slug>
 */

// A flow: the page it starts on, an optional check before the browser opens
// (that a local app is running), what to do before the video starts (such as
// a cookie banner, so the first frame, the new screenshot, is clean), and the
// steps it clicks through
export type Flow = {
  start: string
  check?: () => Promise<void>
  prepare?: (page: Page) => Promise<void>
  play: (page: Page) => Promise<void>
}

// The window and the video: 16:10, the browser frame's shape, and wide enough
// to stay sharp in a preview at most about 800 CSS pixels wide
const SIZE = { width: 1440, height: 900 }

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..', '..')

export const pause = (page: Page, ms: number) => page.waitForTimeout(ms)

/**
 * Scroll the window to the top, the bottom, a position, or an element (with
 * room above it), eased over the given time, as a visitor's scroll would
 */
export const smoothScroll = async (
  page: Page,
  to: 'top' | 'bottom' | number | Locator,
  ms: number,
) => {
  const target =
    typeof to === 'object'
      ? await to.evaluate(
          (element) =>
            element.getBoundingClientRect().top + window.scrollY - 80,
        )
      : to
  await page.evaluate(
    ([target, ms]) =>
      new Promise<void>((resolve) => {
        const from = window.scrollY
        const end =
          target === 'top'
            ? 0
            : target === 'bottom'
              ? document.documentElement.scrollHeight - window.innerHeight
              : Number(target)
        const started = performance.now()
        const step = (now: number) => {
          const t = Math.min((now - started) / Number(ms), 1)
          const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
          window.scrollTo(0, from + (end - from) * eased)
          if (t < 1) requestAnimationFrame(step)
          else resolve()
        }
        requestAnimationFrame(step)
      }),
    [target, ms] as const,
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

export const run = async (slug: string) => {
  const slugs = flows()
  if (!slugs.includes(slug)) {
    throw new Error(
      `Unknown project "${slug}": record one of ${slugs.join(', ')}`,
    )
  }
  const flow: Flow = (
    await import(pathToFileURL(path.join(here, `${slug}.ts`)).href)
  ).default
  await flow.check?.()
  ffmpeg(['-version'])

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `record-${slug}-`))
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: SIZE,
    recordVideo: { dir, size: SIZE },
  })
  try {
    const page = await context.newPage()
    const opened = Date.now()
    await page.goto(flow.start, { waitUntil: 'networkidle' })
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

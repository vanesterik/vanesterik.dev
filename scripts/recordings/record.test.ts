// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  asciinemaArgs,
  encodeArgs,
  expectScript,
  openingError,
  posterArgs,
  run,
} from './record.ts'

// The argument that follows a flag, or undefined without it
const argumentOf = (args: string[], flag: string) =>
  args[args.indexOf(flag) + 1]

describe('encodeArgs', () => {
  const args = encodeArgs('raw.webm', 'out.mp4', 1.2, 30)

  it('trims the raw recording to the flow', () => {
    expect(argumentOf(args, '-ss')).toBe('1.2')
    expect(argumentOf(args, '-i')).toBe('raw.webm')
    expect(argumentOf(args, '-t')).toBe('30')
    // Seeking before the input is fast and frame-accurate when re-encoding
    expect(args.indexOf('-ss')).toBeLessThan(args.indexOf('-i'))
  })

  it('writes an H.264 MP4 every browser plays, without sound', () => {
    expect(argumentOf(args, '-c:v')).toBe('libx264')
    expect(argumentOf(args, '-pix_fmt')).toBe('yuv420p')
    expect(argumentOf(args, '-movflags')).toBe('+faststart')
    expect(args).toContain('-an')
    expect(args).toContain('-y')
    expect(args.at(-1)).toBe('out.mp4')
  })
})

describe('posterArgs', () => {
  it('takes the first frame of the video', () => {
    const args = posterArgs('out.mp4', 'out.jpg')
    expect(argumentOf(args, '-i')).toBe('out.mp4')
    expect(argumentOf(args, '-frames:v')).toBe('1')
    expect(args).toContain('-y')
    expect(args.at(-1)).toBe('out.jpg')
  })
})

describe('run', () => {
  it('says how to install asciinema when it is missing', async () => {
    const path = process.env.PATH
    process.env.PATH = '/nonexistent'
    try {
      await expect(run('zsh-git-alias')).rejects.toThrow(
        "asciinema isn't installed: run brew install asciinema",
      )
    } finally {
      process.env.PATH = path
    }
  })

  it('names the projects it can record when given another', async () => {
    await expect(run('nope')).rejects.toThrow(
      /^Unknown project "nope": record one of .*leaseplan/,
    )
  })
})

describe('openingError', () => {
  const start = 'https://example.com/'

  it('says a site refused the browser when it drops the connection', () => {
    expect(
      openingError(
        start,
        new Error(
          'page.goto: net::ERR_HTTP2_PROTOCOL_ERROR at https://example.com/',
        ),
      ),
    ).toBe(
      'https://example.com/ refused the browser (ERR_HTTP2_PROTOCOL_ERROR)',
    )
  })

  it('says a page never settled when it times out', () => {
    const timeout = new Error('page.goto: Timeout 30000ms exceeded.')
    timeout.name = 'TimeoutError'
    expect(openingError(start, timeout)).toBe(
      "https://example.com/ didn't finish loading within 30 seconds",
    )
  })

  it('names any other network error as it is', () => {
    expect(
      openingError(
        start,
        new Error(
          'page.goto: net::ERR_INTERNET_DISCONNECTED at https://example.com/',
        ),
      ),
    ).toBe("Couldn't open https://example.com/ (ERR_INTERNET_DISCONNECTED)")
  })
})

describe('asciinemaArgs', () => {
  it('records an 80 by 16 shell, with long waits cut short', () => {
    const args = asciinemaArgs('out.cast', 'zsh -i')
    expect(args[0]).toBe('rec')
    expect(argumentOf(args, '--window-size')).toBe('80x16')
    expect(argumentOf(args, '--idle-time-limit')).toBe('3')
    expect(argumentOf(args, '--command')).toBe('zsh -i')
    expect(args).toContain('--overwrite')
    expect(args.at(-1)).toBe('out.cast')
  })
})

describe('expectScript', () => {
  const script = expectScript(
    [
      { type: 'gst' },
      { type: 'glol', waitFor: '\\(END\\)', pause: 2500, press: 'q' },
    ],
    ['asciinema', 'rec', 'out.cast'],
  )

  it('starts the recording in an 80 by 16 terminal', () => {
    expect(script).toContain('set stty_init "rows 16 columns 80"')
    expect(script).toContain('spawn {asciinema} {rec} {out.cast}')
  })

  it('waits for the prompt, then types each character of a step', () => {
    const gst = script.indexOf('send -- [format %c 103]')
    expect(
      script.lastIndexOf('expect -re {\\$ (\\x1b\\[[0-9;?]*[A-Za-z])*$}', gst),
    ).toBeGreaterThan(-1)
    expect(script).toContain('send -- [format %c 115]')
    expect(script).toContain('send -- [format %c 116]')
    expect(script).toContain('send -- "\\r"')
  })

  it('waits for a pager, pauses, and presses its key', () => {
    expect(script).toContain('expect -re {\\(END\\)}')
    expect(script).toContain('after 2500')
    expect(script).toContain('send -- [format %c 113]')
  })

  it('stops with a message when the shell never gets where it should', () => {
    // After spawn: before it, it would watch expect's own input
    expect(script.indexOf('expect_after {')).toBeGreaterThan(
      script.indexOf('spawn '),
    )
    expect(script).toMatch(/timeout \{[^}]*exit 1/)
    expect(script).toMatch(/eof \{[^}]*exit 1/)
  })

  it('ends the shell once the last prompt is back', () => {
    expect(script.trimEnd().endsWith('expect eof')).toBe(true)
    expect(script).toContain('send -- "\\x04"')
  })
})

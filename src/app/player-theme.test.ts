import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const css = fs.readFileSync(
  path.join(process.cwd(), 'src/app/globals.css'),
  'utf8',
)

describe('the terminal player theme', () => {
  it('gives the player only hex colors, the one form it reads', () => {
    // asciinema-player reads its theme as hex and turns anything else, such
    // as an oklch token, into black
    const block = /\.ap-player\.asciinema-player-theme-site \{([^}]*)\}/.exec(
      css,
    )?.[1]
    const colors = [
      ...(block ?? '').matchAll(/--term-color-[\w-]+:\s*([^;]+);/g),
    ]
    expect(colors.length).toBe(18)
    for (const [, value] of colors) {
      expect(value.trim()).toMatch(/^#[0-9a-f]{3}([0-9a-f]{3})?$/i)
    }
  })
})

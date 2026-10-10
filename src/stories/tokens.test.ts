import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { COLOR_TOKENS } from './tokens'

const css = fs.readFileSync(
  path.join(process.cwd(), 'src', 'app', 'globals.css'),
  'utf8',
)

describe('COLOR_TOKENS', () => {
  it('lists every colour token defined in globals.css, and no others', () => {
    // Each token is exposed to Tailwind as --color-<name>
    const defined = [...css.matchAll(/--color-([a-z-]+):/g)].map(
      ([, name]) => name,
    )
    expect([...COLOR_TOKENS].sort()).toEqual(defined.sort())
  })
})

import { describe, expect, it } from 'vitest'

import { repeat } from './repeat'

describe('repeat', () => {
  it('should repeat the string', () => {
    const sayCandyMan = () => 'CandyMan'
    expect(repeat(5, sayCandyMan)).toEqual([
      'CandyMan',
      'CandyMan',
      'CandyMan',
      'CandyMan',
      'CandyMan',
    ])
  })
})

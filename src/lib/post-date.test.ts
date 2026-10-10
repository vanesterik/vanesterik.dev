import { describe, expect, it } from 'vitest'

import { formatPostDate } from './post-date'

describe('formatPostDate', () => {
  it('formats as DD MON YYYY without shifting the day', () => {
    expect(formatPostDate('2026-10-08')).toBe('08 OCT 2026')
    expect(formatPostDate('2026-01-01')).toBe('01 JAN 2026')
    expect(formatPostDate('2026-09-30')).toBe('30 SEP 2026')
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'

import { random } from './random'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('random', () => {
  it('should return a random number between passed min-max parameters', () => {
    const number = random(0, 5)
    expect(number).toBeGreaterThanOrEqual(0)
    expect(number).toBeLessThanOrEqual(5)
  })

  it('returns whole numbers from the first to the second, both included', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.9999)

    expect([random(1, 2), random(1, 2)]).toEqual([1, 2])
  })

  it('counts down when the second is below the first', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.9999)

    expect([random(-1, -5), random(-1, -5)]).toEqual([-1, -5])
  })
})

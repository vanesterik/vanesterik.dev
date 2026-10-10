import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { game } from './particles'

// The element the game draws in, which the home page renders
let container: HTMLElement

// Controllable stand-ins for the browser APIs the animation is driven by
let observers: {
  callback: ResizeObserverCallback
  disconnect: ReturnType<typeof vi.fn>
}[]
let frames: Map<number, FrameRequestCallback>
let nextFrameId: number
// What performance.now() returns; every frame moves it on by a 60th of a second
let now: number

const fireResize = (width = 300, height = 200) => {
  const canvas = container.querySelector('canvas')
  for (const { callback } of observers) {
    callback(
      [
        {
          target: canvas ?? document.createElement('canvas'),
          contentRect: { width, height },
        } as unknown as ResizeObserverEntry,
      ],
      {} as ResizeObserver,
    )
  }
}

type Drawing = {
  x: number
  y: number
  radius: number
  type?: 'fill' | 'stroke'
  color?: string
}

// Records what the game draws, as jsdom has no canvas implementation: each
// circle, and whether it was filled or outlined in which colour
const stubContext = () => {
  const drawings: Drawing[] = []
  const finish = (drawing: Omit<Drawing, 'x' | 'y' | 'radius'>) =>
    Object.assign(drawings[drawings.length - 1], drawing)
  const context = {
    arc: vi.fn((x: number, y: number, radius: number) => {
      drawings.push({ x, y, radius })
    }),
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    closePath: vi.fn(),
    drawings,
    fill: vi.fn(() => finish({ type: 'fill', color: context.fillStyle })),
    fillStyle: '',
    lineWidth: 0,
    stroke: vi.fn(() => finish({ type: 'stroke', color: context.strokeStyle })),
    strokeStyle: '',
  }
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  )
  return context
}

// Everything drawn since the last call, split into particles, which have a
// radius of 20, and the rings around held particles
const takeDrawings = (context: ReturnType<typeof stubContext>) => {
  const drawings = context.drawings.splice(0)
  return {
    particles: drawings.filter(({ radius }) => radius === 20),
    rings: drawings.filter(({ radius }) => radius !== 20),
  }
}

// Centres of the particles drawn since the last call
const drawnParticles = (context: ReturnType<typeof stubContext>) =>
  takeDrawings(context).particles.map(({ x, y }) => ({ x, y }))

// How many particles were drawn filled and outlined since the last call
const drawnTypes = (context: ReturnType<typeof stubContext>) => {
  const { particles } = takeDrawings(context)
  return {
    fill: particles.filter(({ type }) => type === 'fill').length,
    stroke: particles.filter(({ type }) => type === 'stroke').length,
  }
}

const getCanvas = () => container.querySelector('canvas') as HTMLCanvasElement

// jsdom places every element at the page's origin, so client coordinates are
// canvas coordinates
const firePointer = (type: string, x: number, y: number, pointerId = 1) =>
  getCanvas().dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      clientX: x,
      clientY: y,
      pointerId,
    }),
  )

const fireTouchStart = (x: number, y: number) => {
  const event = new TouchEvent('touchstart', {
    bubbles: true,
    cancelable: true,
  })
  // jsdom has no Touch constructor
  Object.defineProperty(event, 'changedTouches', {
    value: [{ clientX: x, clientY: y }],
  })
  getCanvas().dispatchEvent(event)
  return event
}

// How far the first particle drawn moves in a frame, a frame from now.
// Particles are drawn by id, so in the tests that's the grabbed one
const firstParticleStep = (
  context: ReturnType<typeof stubContext>,
  interval = 1000 / 60,
) => {
  drawnParticles(context)
  runFrames(interval)
  const from = drawnParticles(context)[0]
  runFrames(interval)
  const to = drawnParticles(context)[0]
  return { x: to.x - from.x, y: to.y - from.y }
}

// Run the frames requested so far, the passed number of ms after the last ones
const runFrames = (interval = 1000 / 60) => {
  now += interval
  const pending = [...frames.values()]
  frames.clear()
  for (const frame of pending) frame(0)
}

beforeEach(() => {
  observers = []
  frames = new Map()
  nextFrameId = 1
  now = 0
  vi.spyOn(performance, 'now').mockImplementation(() => now)

  vi.stubGlobal(
    'ResizeObserver',
    class {
      disconnect = vi.fn()
      constructor(callback: ResizeObserverCallback) {
        observers.push({ callback, disconnect: this.disconnect })
      }
      observe() {}
      unobserve() {}
    },
  )
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = nextFrameId++
    frames.set(id, callback)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    frames.delete(id)
  })
  // jsdom has no canvas implementation
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  // jsdom has no pointer capture
  Element.prototype.setPointerCapture = vi.fn()

  container = document.createElement('div')
  document.body.append(container)
})

afterEach(() => {
  container.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  delete (Element.prototype as Partial<Element>).setPointerCapture
})

describe('game', () => {
  it('starts its render loop once the canvas has a size', () => {
    game(container)

    fireResize()

    expect(frames.size).toBe(1)
  })

  it('stays stopped when finalised before the canvas has a size', () => {
    // React's development mode mounts, cleans up and remounts effects at once
    const finalize = game(container)
    finalize()

    fireResize()
    container.remove()

    expect(() => runFrames()).not.toThrow()
    expect(frames.size).toBe(0)
  })

  it('stops a running loop and its resize observer when finalised', () => {
    const finalize = game(container)
    fireResize()
    runFrames()

    finalize()

    expect(frames.size).toBe(0)
    expect(observers[0].disconnect).toHaveBeenCalled()
  })

  it('removes its canvas when finalised', () => {
    const finalize = game(container)

    finalize()

    expect(container.querySelector('canvas')).toBeNull()
  })

  it('leaves a single canvas when mounted again', () => {
    // React's development mode mounts, cleans up and remounts effects at once
    game(container)()
    game(container)

    expect(container.querySelectorAll('canvas')).toHaveLength(1)
  })

  it('draws in the current colour of its canvas', () => {
    const context = stubContext()
    game(container)
    fireResize()
    const canvas = getCanvas()

    canvas.style.color = 'rgb(255, 0, 0)'
    runFrames()
    expect(context.fillStyle).toBe('rgb(255, 0, 0)')
    expect(context.strokeStyle).toBe('rgb(255, 0, 0)')

    // A theme change only changes the colour, it doesn't restart the game
    canvas.style.color = 'rgb(0, 0, 255)'
    runFrames()
    expect(context.fillStyle).toBe('rgb(0, 0, 255)')
    expect(context.strokeStyle).toBe('rgb(0, 0, 255)')
  })

  it.each([
    [390, 844, 36],
    [700, 400, 48],
    [768, 1024, 88],
    [1024, 768, 104],
    [1440, 900, 135],
    [1920, 1080, 180],
  ])(
    'starts a %ipx by %ipx canvas with %i particles',
    (width, height, count) => {
      const context = stubContext()
      game(container)

      fireResize(width, height)
      runFrames()

      expect(drawnParticles(context)).toHaveLength(count)
    },
  )

  it('keeps its particles when the canvas is resized within a breakpoint', () => {
    const context = stubContext()
    game(container)
    fireResize(300, 200)
    runFrames()
    const before = drawnParticles(context)

    fireResize(600, 400)
    runFrames()
    const after = drawnParticles(context)

    expect(after).toHaveLength(before.length)
    // Every particle moved on from where it was instead of starting over
    expect(after).not.toEqual(before)
  })

  it('adds and removes particles when the canvas crosses a breakpoint', () => {
    const context = stubContext()
    game(container)
    fireResize(390, 844)
    runFrames()
    drawnParticles(context)

    fireResize(1440, 900)
    runFrames()
    expect(drawnParticles(context)).toHaveLength(135)

    fireResize(390, 844)
    runFrames()
    expect(drawnParticles(context)).toHaveLength(36)
  })

  it('brings its particles back inside a canvas that shrinks', () => {
    const context = stubContext()
    game(container)
    fireResize(300, 200)
    runFrames()
    drawnParticles(context)

    fireResize(100, 100)
    for (let frame = 0; frame < 10; frame++) {
      runFrames()
      // Particles have a radius of 20
      for (const { x, y } of drawnParticles(context)) {
        expect(x).toBeGreaterThanOrEqual(20)
        expect(x).toBeLessThanOrEqual(80)
        expect(y).toBeGreaterThanOrEqual(20)
        expect(y).toBeLessThanOrEqual(80)
      }
    }
  })

  it('stops by itself when its canvas leaves the page before it is finalised', () => {
    // React removes the canvas before it runs the effect's cleanup, so a frame
    // can fire in between
    game(container)
    fireResize()
    runFrames()

    container.remove()

    expect(() => runFrames()).not.toThrow()
    expect(frames.size).toBe(0)
  })
})

describe('dragging', () => {
  // On a 390 by 844 canvas the 36 particles sit in the middle of a 5 by 8 grid
  // of 78 by 105.5 cells; the first 2 columns are filled, the rest outlined
  const FIRST_PARTICLE = { x: 39, y: 52.75 }
  // Between cells, clear of every particle
  const FREE_SPOT = { x: 156, y: 422 }

  let context: ReturnType<typeof stubContext>

  beforeEach(() => {
    // Every particle starts moving 1 right or left and 1 up
    vi.spyOn(Math, 'random').mockReturnValue(0)
    context = stubContext()
    game(container)
    fireResize(390, 844)
    runFrames()
    drawnParticles(context)
    drawnTypes(context)
  })

  it('flips a particle it grabs from filled to outlined', () => {
    firePointer('pointerdown', FIRST_PARTICLE.x, FIRST_PARTICLE.y)
    runFrames()

    expect(drawnTypes(context)).toEqual({ fill: 14, stroke: 22 })
  })

  it('keeps the flipped type after letting go', () => {
    firePointer('pointerdown', FIRST_PARTICLE.x, FIRST_PARTICLE.y)
    firePointer('pointerup', FIRST_PARTICLE.x, FIRST_PARTICLE.y)
    runFrames()

    expect(drawnTypes(context)).toEqual({ fill: 14, stroke: 22 })
  })

  it('grabs nothing when pressed beside a particle', () => {
    firePointer('pointerdown', 78, 105)
    runFrames()

    expect(drawnTypes(context)).toEqual({ fill: 15, stroke: 21 })
  })

  it('moves a grabbed particle with the pointer', () => {
    firePointer('pointerdown', FIRST_PARTICLE.x, FIRST_PARTICLE.y)
    firePointer('pointermove', FREE_SPOT.x, FREE_SPOT.y)
    runFrames()

    expect(drawnParticles(context)).toContainEqual(FREE_SPOT)
  })

  it('follows only the pointer that grabbed the particle', () => {
    firePointer('pointerdown', FIRST_PARTICLE.x, FIRST_PARTICLE.y, 1)
    firePointer('pointermove', FREE_SPOT.x, FREE_SPOT.y, 1)
    // A second finger moves and lifts elsewhere
    firePointer('pointermove', 300, 700, 2)
    firePointer('pointerup', 300, 700, 2)
    runFrames()

    expect(drawnParticles(context)).toContainEqual(FREE_SPOT)
  })

  it('keeps a grabbed particle inside the canvas', () => {
    firePointer('pointerdown', FIRST_PARTICLE.x, FIRST_PARTICLE.y)
    firePointer('pointermove', -50, 2000)
    runFrames()

    // Particles have a radius of 20
    expect(drawnParticles(context)).toContainEqual({ x: 20, y: 824 })
  })

  it('lets go of a particle when the pointer is released', () => {
    firePointer('pointerdown', FIRST_PARTICLE.x, FIRST_PARTICLE.y)
    firePointer('pointermove', FREE_SPOT.x, FREE_SPOT.y)
    firePointer('pointerup', FREE_SPOT.x, FREE_SPOT.y)
    firePointer('pointermove', 300, 700)
    runFrames()

    const particles = drawnParticles(context)
    expect(particles).not.toContainEqual({ x: 300, y: 700 })
    expect(particles).not.toContainEqual(FREE_SPOT)
  })

  it('keeps other particles four radii clear of a held particle', () => {
    firePointer('pointerdown', FIRST_PARTICLE.x, FIRST_PARTICLE.y)
    // Half a second, for the buffer to grow to its full width
    for (let frame = 0; frame < 30; frame++) runFrames()
    takeDrawings(context)

    // Sweep it down through its column and across the next one
    for (let step = 1; step <= 10; step++) {
      const held = { x: 39 + step * 8, y: 52.75 + step * 30 }
      firePointer('pointermove', held.x, held.y)
      runFrames()

      const others = drawnParticles(context).filter(
        ({ x, y }) => x !== held.x || y !== held.y,
      )
      expect(others).toHaveLength(35)
      for (const { x, y } of others) {
        // Two radii of 20 plus a buffer of four radii
        expect(Math.hypot(x - held.x, y - held.y)).toBeGreaterThanOrEqual(
          120 - 1e-9,
        )
      }
    }
  })

  it('leaves the types of particles that bounce off a held particle', () => {
    firePointer('pointerdown', FIRST_PARTICLE.x, FIRST_PARTICLE.y)
    drawnTypes(context)

    // The outlined held particle pushes through filled ones, before the
    // filled and outlined halves of the field meet
    for (let step = 1; step <= 10; step++) {
      const held = { x: 39 + step * 8, y: 52.75 + step * 30 }
      firePointer('pointermove', held.x, held.y)
      runFrames()

      const { particles } = takeDrawings(context)
      expect(
        particles.find(({ x, y }) => x === held.x && y === held.y)?.type,
      ).toBe('stroke')
      expect(particles.filter(({ type }) => type === 'fill')).toHaveLength(14)
      expect(particles.filter(({ type }) => type === 'stroke')).toHaveLength(22)
    }
  })

  it('slows a thrown particle, and those it hits, back to normal speed', () => {
    firePointer('pointerdown', FIRST_PARTICLE.x, FIRST_PARTICLE.y)
    for (let step = 1; step <= 12; step++) {
      firePointer('pointermove', FIRST_PARTICLE.x, FIRST_PARTICLE.y + step * 60)
      runFrames()
    }
    firePointer('pointerup', FIRST_PARTICLE.x, FIRST_PARTICLE.y + 720)

    // About a second at 60 frames per second
    for (let frame = 0; frame < 80; frame++) runFrames()
    drawnParticles(context)
    runFrames()
    const from = drawnParticles(context)
    runFrames()
    const to = drawnParticles(context)

    // No faster than a particle starts out: 3px across and 6px up
    to.forEach(({ x, y }, index) => {
      expect(
        Math.hypot(x - from[index].x, y - from[index].y),
      ).toBeLessThanOrEqual(7 + 1e-9)
    })
  })

  it('grows the buffer to full width over half a second, easing out', () => {
    firePointer('pointerdown', FIRST_PARTICLE.x, FIRST_PARTICLE.y)
    // The radius of the ring drawn in the next frame
    const ringRadius = () => {
      takeDrawings(context)
      runFrames()
      return takeDrawings(context).rings[0]?.radius
    }

    // A radius of 20 plus a buffer of 80 times the eased progress
    for (let frame = 1; frame < 15; frame++) runFrames()
    expect(ringRadius()).toBeCloseTo(20 + 80 * (1 - 0.5 ** 3))
    for (let frame = 16; frame < 30; frame++) runFrames()
    expect(ringRadius()).toBeCloseTo(100)
    expect(ringRadius()).toBeCloseTo(100)
  })

  it('keeps other particles clear of the buffer while it grows', () => {
    firePointer('pointerdown', FIRST_PARTICLE.x, FIRST_PARTICLE.y)
    firePointer('pointermove', FREE_SPOT.x, FREE_SPOT.y)
    for (let frame = 1; frame < 15; frame++) runFrames()
    drawnParticles(context)
    runFrames()

    // Two radii of 20 plus three quarters of the way to a buffer of 80
    for (const { x, y } of drawnParticles(context)) {
      if (x === FREE_SPOT.x && y === FREE_SPOT.y) continue
      expect(
        Math.hypot(x - FREE_SPOT.x, y - FREE_SPOT.y),
      ).toBeGreaterThanOrEqual(40 + 80 * (1 - 0.5 ** 3) - 1e-9)
    }
  })

  it('draws the buffer behind the particles in the buffer colour', () => {
    getCanvas().style.setProperty('--buffer', 'rgb(1, 2, 3)')
    firePointer('pointerdown', FIRST_PARTICLE.x, FIRST_PARTICLE.y)
    runFrames()

    expect(context.drawings[0]).toMatchObject({
      x: FIRST_PARTICLE.x,
      y: FIRST_PARTICLE.y,
      type: 'stroke',
      color: 'rgb(1, 2, 3)',
    })
    expect(takeDrawings(context).rings).toHaveLength(1)
  })

  it('removes the buffer when the particle is let go', () => {
    firePointer('pointerdown', FIRST_PARTICLE.x, FIRST_PARTICLE.y)
    for (let frame = 0; frame < 30; frame++) runFrames()
    firePointer('pointerup', FIRST_PARTICLE.x, FIRST_PARTICLE.y)
    takeDrawings(context)
    runFrames()

    expect(takeDrawings(context).rings).toHaveLength(0)
  })

  it('shows a grab cursor over particles and while dragging', () => {
    const canvas = getCanvas()

    firePointer('pointermove', FIRST_PARTICLE.x, FIRST_PARTICLE.y)
    expect(canvas.style.cursor).toBe('grab')

    firePointer('pointerdown', FIRST_PARTICLE.x, FIRST_PARTICLE.y)
    expect(canvas.style.cursor).toBe('grabbing')

    firePointer('pointerup', FIRST_PARTICLE.x, FIRST_PARTICLE.y)
    firePointer('pointermove', FREE_SPOT.x, FREE_SPOT.y)
    expect(canvas.style.cursor).toBe('')
  })

  it('stops a touch on a particle from scrolling the page', () => {
    expect(
      fireTouchStart(FIRST_PARTICLE.x, FIRST_PARTICLE.y).defaultPrevented,
    ).toBe(true)
  })

  it('lets a touch beside the particles scroll the page', () => {
    expect(fireTouchStart(FREE_SPOT.x, FREE_SPOT.y).defaultPrevented).toBe(
      false,
    )
  })
})

describe('throwing', () => {
  // On a 600 by 3000 canvas the 36 particles sit in the middle of a 3 by 12
  // grid of 200 by 250 cells, with clear lanes between them to throw through
  const FIRST_PARTICLE = { x: 100, y: 125 }
  const LANE = { x: 200, y: 250 }

  let context: ReturnType<typeof stubContext>

  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    context = stubContext()
    game(container)
    fireResize(600, 3000)
    runFrames()
  })

  it('moves particles as far per second on a 120Hz screen', () => {
    // Every particle starts moving 1px right and 1px up per 60th of a second
    const from = drawnParticles(context)[0]
    runFrames(1000 / 120)
    drawnParticles(context)
    runFrames(1000 / 120)
    const to = drawnParticles(context)[0]

    expect(to.x).toBeCloseTo(from.x + 1)
    expect(to.y).toBeCloseTo(from.y - 1)
  })

  it('moves particles at most three steps after a long pause', () => {
    const from = drawnParticles(context)[0]
    // As when coming back to a tab that was in the background
    runFrames(5000)
    const to = drawnParticles(context)[0]

    expect(to.x).toBeCloseTo(from.x + 3)
    expect(to.y).toBeCloseTo(from.y - 3)
  })

  it('throws and slows a particle down at the same speed on a 120Hz screen', () => {
    firePointer('pointerdown', FIRST_PARTICLE.x, FIRST_PARTICLE.y)
    for (let step = 0; step <= 12; step++) {
      firePointer('pointermove', LANE.x, LANE.y + step * 30)
      runFrames(1000 / 120)
    }
    firePointer('pointerup', LANE.x, LANE.y + 360)

    // Thrown at 30 per 60th of a second, so 15 per frame, and slowed by 2% per
    // 60th of a second over two half-length frames
    const { x, y } = firstParticleStep(context, 1000 / 120)
    expect(x).toBeCloseTo(0, 0)
    expect(y).toBeCloseTo((30 * 0.98) / 2, 0)
  })

  it('throws a particle on in the direction it was dragged', () => {
    firePointer('pointerdown', FIRST_PARTICLE.x, FIRST_PARTICLE.y)
    for (let step = 0; step <= 12; step++) {
      firePointer('pointermove', LANE.x + step * 5, LANE.y)
      runFrames()
    }
    firePointer('pointerup', LANE.x + 60, LANE.y)

    const { x, y } = firstParticleStep(context)
    expect(x).toBeCloseTo(5, 0)
    expect(y).toBeCloseTo(0, 0)
  })

  it('caps the speed of a throw at 30px per frame', () => {
    firePointer('pointerdown', FIRST_PARTICLE.x, FIRST_PARTICLE.y)
    for (let step = 0; step <= 6; step++) {
      firePointer('pointermove', LANE.x, LANE.y + step * 60)
      runFrames()
    }
    firePointer('pointerup', LANE.x, LANE.y + 360)

    // Thrown at 30, it has slowed by 2% twice by the step measured
    const { x, y } = firstParticleStep(context)
    expect(x).toBeCloseTo(0, 0)
    expect(y).toBeCloseTo(30 * 0.98 ** 2, 0)
  })
})

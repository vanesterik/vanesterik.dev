import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { game } from './particles'

const CONTAINER_ID = 'game-container'

// Controllable stand-ins for the browser APIs the animation is driven by
let observers: {
  callback: ResizeObserverCallback
  disconnect: ReturnType<typeof vi.fn>
}[]
let frames: Map<number, FrameRequestCallback>
let nextFrameId: number

const fireResize = (width = 300, height = 200) => {
  const canvas = document.getElementById('game')
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

// Records what the game draws, as jsdom has no canvas implementation
const stubContext = () => {
  const context = {
    arc: vi.fn(),
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    fillStyle: '',
    lineWidth: 0,
    stroke: vi.fn(),
    strokeStyle: '',
  }
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  )
  return context
}

// Centres of the particles drawn since the last call
const drawnParticles = (context: ReturnType<typeof stubContext>) => {
  const particles = context.arc.mock.calls.map(([x, y]) => ({ x, y }))
  context.arc.mockClear()
  return particles
}

// Whether the particle drawn at the passed centre was filled or outlined
const drawnTypeAt = (
  context: ReturnType<typeof stubContext>,
  at: { x: number; y: number },
) => {
  const index = context.arc.mock.calls.findIndex(
    ([x, y]) => x === at.x && y === at.y,
  )
  const order = context.arc.mock.invocationCallOrder[index]
  const next = (draw: ReturnType<typeof vi.fn>) =>
    draw.mock.invocationCallOrder.find((call) => call > order) ?? Infinity
  return next(context.fill) < next(context.stroke) ? 'fill' : 'stroke'
}

// How many particles were drawn filled and outlined since the last call
const drawnTypes = (context: ReturnType<typeof stubContext>) => {
  const types = {
    fill: context.fill.mock.calls.length,
    stroke: context.stroke.mock.calls.length,
  }
  context.fill.mockClear()
  context.stroke.mockClear()
  return types
}

const getCanvas = () => document.getElementById('game') as HTMLCanvasElement

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
const firstParticleStep = (context: ReturnType<typeof stubContext>) => {
  drawnParticles(context)
  runFrames()
  const from = drawnParticles(context)[0]
  runFrames()
  const to = drawnParticles(context)[0]
  return { x: to.x - from.x, y: to.y - from.y }
}

const runFrames = () => {
  const pending = [...frames.values()]
  frames.clear()
  for (const frame of pending) frame(0)
}

beforeEach(() => {
  observers = []
  frames = new Map()
  nextFrameId = 1

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

  const container = document.createElement('div')
  container.id = CONTAINER_ID
  document.body.append(container)
})

afterEach(() => {
  document.getElementById(CONTAINER_ID)?.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  delete (Element.prototype as Partial<Element>).setPointerCapture
})

describe('game', () => {
  it('starts its render loop once the canvas has a size', () => {
    game(CONTAINER_ID)

    fireResize()

    expect(frames.size).toBe(1)
  })

  it('stays stopped when finalised before the canvas has a size', () => {
    // React's development mode mounts, cleans up and remounts effects at once
    const finalize = game(CONTAINER_ID)
    finalize()

    fireResize()
    document.getElementById(CONTAINER_ID)?.remove()

    expect(() => runFrames()).not.toThrow()
    expect(frames.size).toBe(0)
  })

  it('stops a running loop and its resize observer when finalised', () => {
    const finalize = game(CONTAINER_ID)
    fireResize()
    runFrames()

    finalize()

    expect(frames.size).toBe(0)
    expect(observers[0].disconnect).toHaveBeenCalled()
  })

  it('draws in the current colour of its canvas', () => {
    const context = stubContext()
    game(CONTAINER_ID)
    fireResize()
    const canvas = document.getElementById('game') as HTMLCanvasElement

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
      game(CONTAINER_ID)

      fireResize(width, height)
      runFrames()

      expect(drawnParticles(context)).toHaveLength(count)
    },
  )

  it('keeps its particles when the canvas is resized within a breakpoint', () => {
    const context = stubContext()
    game(CONTAINER_ID)
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
    game(CONTAINER_ID)
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
    game(CONTAINER_ID)
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
    game(CONTAINER_ID)
    fireResize()
    runFrames()

    document.getElementById(CONTAINER_ID)?.remove()

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
    game(CONTAINER_ID)
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

  it('keeps other particles a radius clear of a held particle', () => {
    firePointer('pointerdown', FIRST_PARTICLE.x, FIRST_PARTICLE.y)

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
        // Two radii of 20 plus a buffer of one radius
        expect(Math.hypot(x - held.x, y - held.y)).toBeGreaterThanOrEqual(
          60 - 1e-9,
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

      expect(drawnTypeAt(context, held)).toBe('stroke')
      expect(drawnTypes(context)).toEqual({ fill: 14, stroke: 22 })
      drawnParticles(context)
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
      expect(Math.hypot(x - from[index].x, y - from[index].y)).toBeLessThan(7)
    })
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
    game(CONTAINER_ID)
    fireResize(600, 3000)
    runFrames()
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

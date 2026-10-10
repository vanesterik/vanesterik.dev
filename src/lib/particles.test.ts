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
const firePointer = (type: string, x: number, y: number) =>
  getCanvas().dispatchEvent(
    new PointerEvent(type, { bubbles: true, clientX: x, clientY: y }),
  )

const fireTouchStart = (x: number, y: number) => {
  const event = new TouchEvent('touchstart', {
    bubbles: true,
    cancelable: true,
  })
  // jsdom has no Touch constructor
  Object.defineProperty(event, 'touches', {
    value: [{ clientX: x, clientY: y }],
  })
  getCanvas().dispatchEvent(event)
  return event
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

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

const fireResize = () => {
  const canvas = document.getElementById('game')
  for (const { callback } of observers) {
    callback(
      [
        {
          target: canvas ?? document.createElement('canvas'),
          contentRect: { width: 300, height: 200 },
        } as unknown as ResizeObserverEntry,
      ],
      {} as ResizeObserver,
    )
  }
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

  const container = document.createElement('div')
  container.id = CONTAINER_ID
  document.body.append(container)
})

afterEach(() => {
  document.getElementById(CONTAINER_ID)?.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
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

import { random } from '@/lib/random'

// Types ///////////////////////////////////////////////////////////////////////

enum ActionTypes {
  SET_PARTICLES,
  SET_FRAME_ID,
  SET_INITIAL_STATE,
  UPDATE_PARTICLE_COLLISION,
  UPDATE_PARTICLE_HORIZONTAL_BOUNDARY,
  UPDATE_PARTICLE_POSITION,
  UPDATE_PARTICLE_VERTICAL_BOUNDARY,
}

type SetParticlesAction = {
  type: ActionTypes.SET_PARTICLES
  payload: Record<number, Particle>
}

type SetFrameIdAction = {
  type: ActionTypes.SET_FRAME_ID
  payload: number
}

type SetInitialStateAction = {
  type: ActionTypes.SET_INITIAL_STATE
}

type UpdateParticlePositionAction = {
  type: ActionTypes.UPDATE_PARTICLE_POSITION
  payload: Pick<Particle, 'id' | 'x' | 'y'>
}

type UpdateParticleCollisionAction = {
  type: ActionTypes.UPDATE_PARTICLE_COLLISION
  payload: Pick<Particle, 'id' | 'type' | 'vx' | 'vy'>
}

type UpdateParticleHorizontalBoundaryAction = {
  type: ActionTypes.UPDATE_PARTICLE_HORIZONTAL_BOUNDARY
  payload: Pick<Particle, 'id' | 'vx' | 'x'>
}

type UpdateParticleVerticalBoundaryAction = {
  type: ActionTypes.UPDATE_PARTICLE_VERTICAL_BOUNDARY
  payload: Pick<Particle, 'id' | 'vy' | 'y'>
}

type Action =
  | SetParticlesAction
  | SetFrameIdAction
  | SetInitialStateAction
  | UpdateParticleCollisionAction
  | UpdateParticleHorizontalBoundaryAction
  | UpdateParticlePositionAction
  | UpdateParticleVerticalBoundaryAction

type Listener = (state: State, previousState: State) => void

type Reducer = (state: State, action: Action) => State

type State = {
  particles: Record<number, Particle>
  frameId: number
}

type Store = {
  dispatch: (action: Action) => void
  getParticles: () => Particle[]
  getFrameId: () => number
  subscribe: (listener: Listener) => () => void
}

enum ParticleTypes {
  FILL = 'fill',
  STROKE = 'stroke',
}

type Particle = {
  id: number
  radius: number
  type: ParticleTypes
  vx: number
  vy: number
  x: number
  y: number
}

// Core ////////////////////////////////////////////////////////////////////////

const GAME_ID = 'game'

// Number of particles per Tailwind breakpoint, widest first: a canvas gets the
// count of the first breakpoint it is at least as wide as
const PARTICLE_COUNTS = [
  { minWidth: 1536, count: 180 }, // 2xl
  { minWidth: 1280, count: 135 }, // xl
  { minWidth: 1024, count: 104 }, // lg
  { minWidth: 768, count: 88 }, // md
  { minWidth: 640, count: 48 }, // sm
  { minWidth: 0, count: 36 },
]

const PARTICLE_RADIUS = 20

// How often to look for a free spot for an added particle before placing it
// on top of others anyway
const PLACEMENT_ATTEMPTS = 10

/**
 * Main game function which creates a canvas element and appends it to the
 * passed container id. It sets the stage for the game by creating the
 * initial state and starting the render loop. Particles are drawn in the
 * canvas's CSS colour, so a theme change recolours them without a restart.
 */
export const game = (containerId: string) => {
  const container = document.getElementById(containerId)

  if (!container)
    return () => {
      console.error('Container not found')
    }

  const reducer = createReducer({ frameId: 0, particles: {} })
  const store = createStore(reducer)
  store.dispatch({ type: ActionTypes.SET_INITIAL_STATE })

  createCanvas(container)
  const stopResizing = resizeCanvas(store)
  const stopStarting = initialize(store)

  // Return a function that stops everything the game set up, so nothing keeps
  // running once the canvas is gone: React may finalize the game before the
  // first resize has even started the render loop
  return () => {
    stopResizing()
    stopStarting()
    finalize(store)
  }
}

/**
 * Initialize game by starting render loop
 */
const initialize = (store: Store) => {
  const { dispatch, subscribe } = store
  const unsubscribe = subscribe((state) => {
    if (!state) return
    // Directly unsubscribe from state changes, because this function should
    // only be called once
    unsubscribe()
    // Start render loop by requesting animation frame
    const requestId = requestAnimationFrame(() => render(store))
    // Dispatch returned request id to state in order to cancel requested
    // animation frame when finalizing the game
    dispatch({ type: ActionTypes.SET_FRAME_ID, payload: requestId })
  })

  // Stops the loop from starting if the game is finalized before it has
  return unsubscribe
}

/**
 * Finalize game by stopping render loop
 */
const finalize = ({ getFrameId }: Store) => cancelAnimationFrame(getFrameId())

/**
 * Create state container store based on passed reducer. The store is an object
 * that contains the state and a dispatch function in order to update the state.
 * The store is passed to all functions that need to update this state.
 */
const createStore = (reducer: Reducer) => {
  // Let is required in order to implement state state container logic
  let state: State
  const listeners: Set<Listener> = new Set()

  const dispatch = (action: Action) => {
    const previousState = state
    // Mutations is required in order to implement state container logic
    state = reducer(state, action)
    listeners.forEach((listener) => {
      listener(state, previousState)
    })
  }

  const getParticles = () => Object.values(state.particles)
  const getFrameId = () => state.frameId

  const subscribe = (listener: Listener) => {
    listeners.add(listener)
    // Directly return unsubscribe function
    return () => listeners.delete(listener)
  }

  return {
    dispatch,
    getParticles,
    getFrameId,
    subscribe,
  }
}

/**
 * Create state reducer based on passed initial state. The reducer is a pure
 * function that takes the previous state and an action, and returns the next
 * state.
 */
const createReducer =
  (initialState: State) =>
  (state: State = initialState, action: Action): State => {
    switch (action.type) {
      case ActionTypes.SET_INITIAL_STATE:
        return state
      case ActionTypes.SET_FRAME_ID:
        return {
          ...state,
          frameId: action.payload,
        }
      case ActionTypes.SET_PARTICLES:
        return {
          ...state,
          particles: action.payload,
        }
      case ActionTypes.UPDATE_PARTICLE_POSITION:
      case ActionTypes.UPDATE_PARTICLE_COLLISION:
      case ActionTypes.UPDATE_PARTICLE_HORIZONTAL_BOUNDARY:
      case ActionTypes.UPDATE_PARTICLE_VERTICAL_BOUNDARY:
        return {
          ...state,
          particles: {
            ...state.particles,
            [action.payload.id]: {
              ...state.particles[action.payload.id],
              ...action.payload,
            },
          },
        }
      default:
        return state
    }
  }

/**
 * Create canvas element and append it to passed container element
 */
const createCanvas = (container: HTMLElement) => {
  const canvas = document.createElement('canvas')
  canvas.setAttribute('id', GAME_ID)
  canvas.classList.add('absolute', 'h-full', 'w-full', 'text-foreground')

  // Replace or append canvas element to container. This is necessary because of
  // hot module reloading in development mode. Otherwise new canvas elements are
  // appended with every hot reload.
  const oldCanvas = document.getElementById(GAME_ID)
  if (oldCanvas) {
    container.replaceChild(canvas, oldCanvas)
  } else {
    container.appendChild(canvas)
  }
}

/**
 * Set canvas element width and height based on observer entries dimensions,
 * and match the number of particles to the width. Particles that end up
 * outside a canvas that shrank are brought back in by the boundary detection.
 */
const resizeCanvas = (store: Store) => {
  const canvas = getCanvas()

  const observer = new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.target.id === GAME_ID) {
        const width = entry.contentRect.width
        const height = entry.contentRect.height

        canvas.setAttribute('width', `${width}`)
        canvas.setAttribute('height', `${height}`)

        updateParticleCount(store, width, height)
      }
    })
  })
  observer.observe(canvas)

  return () => observer.disconnect()
}

/**
 * Match the number of particles to the breakpoint of the canvas width. The
 * first size lays them out on a grid. Crossing a breakpoint later adds
 * particles in free spots or removes the newest ones, and leaves the others
 * where they are, so the animation carries on.
 */
const updateParticleCount = (
  { dispatch, getParticles }: Store,
  width: number,
  height: number,
) => {
  const particles = getParticles()
  const count = getParticleCount(width)

  if (particles.length === count) return

  if (particles.length === 0) {
    dispatch({
      type: ActionTypes.SET_PARTICLES,
      payload: toRecord(createParticleGrid(count, width, height)),
    })
    return
  }

  // Particles are listed by ascending id, so the newest are removed first
  const kept = particles.slice(0, count)
  const nextId = Math.max(...particles.map(({ id }) => id)) + 1
  const added: Particle[] = []

  for (let index = 0; index < count - kept.length; index++) {
    const { x, y } = findFreeSpot([...kept, ...added], width, height)
    added.push(createParticle(nextId + index, x, y, width))
  }

  dispatch({
    type: ActionTypes.SET_PARTICLES,
    payload: toRecord([...kept, ...added]),
  })
}

/**
 * Lay out the passed number of particles on a grid that fits the canvas
 */
const createParticleGrid = (count: number, width: number, height: number) => {
  const columns = Math.ceil(Math.sqrt((count * width) / height))
  const rows = Math.ceil(count / columns)
  const cellWidth = width / columns
  const cellHeight = height / rows

  return Array.from(Array(count).keys()).map((id) =>
    createParticle(
      id,
      cellWidth * ((id % columns) + 0.5),
      cellHeight * (Math.floor(id / columns) + 0.5),
      width,
    ),
  )
}

/**
 * Find a random spot inside the canvas that doesn't overlap the passed
 * particles, or the last spot tried when there's no room
 */
const findFreeSpot = (particles: Particle[], width: number, height: number) => {
  let spot = { x: 0, y: 0 }

  for (let attempt = 0; attempt < PLACEMENT_ATTEMPTS; attempt++) {
    spot = {
      x: PARTICLE_RADIUS + Math.random() * (width - PARTICLE_RADIUS * 2),
      y: PARTICLE_RADIUS + Math.random() * (height - PARTICLE_RADIUS * 2),
    }
    const isFree = particles.every(
      ({ radius, x, y }) =>
        Math.hypot(x - spot.x, y - spot.y) >= radius + PARTICLE_RADIUS,
    )
    if (isFree) break
  }

  return spot
}

/**
 * Create a particle at the passed position. Particles in the left half of the
 * canvas are filled and move right, those in the right half are outlined and
 * move left, so the two halves meet.
 */
const createParticle = (
  id: number,
  x: number,
  y: number,
  width: number,
): Particle => {
  const isLeftHalf = x < width / 2

  return {
    id,
    radius: PARTICLE_RADIUS,
    type: isLeftHalf ? ParticleTypes.FILL : ParticleTypes.STROKE,
    vx: isLeftHalf ? random(1, 2) : random(-1, -2),
    vy: random(-1, -5),
    x,
    y,
  }
}

/**
 * Render function which is called recursively by requestAnimationFrame, which
 * calls all functions that should be executed on every frame - ie. particle
 * position updates, collision detection, etc. You could see this as the game
 * engine.
 */
const render = (store: Store) => {
  const { dispatch } = store

  // Stop when the canvas has left the page: React removes it before it runs the
  // effect cleanup that finalizes the game, so a frame can land in between
  if (!getCanvas()) return

  updateParticlePositions(store)
  detectParticleBoundaries(store)
  detectParticleCollisions(store)

  clearCanvas()
  drawParticles(store)

  // Call render function recursively by requesting animation frame again
  const requestId = requestAnimationFrame(() => render(store))
  // Dispatch returned request id to state in order to cancel requested
  // animation frame when finalizing the game
  dispatch({ type: ActionTypes.SET_FRAME_ID, payload: requestId })
}

/**
 * Update particle position by adding velocity to x and y coordinates
 */
const updateParticlePositions = ({ dispatch, getParticles }: Store) => {
  const particles = getParticles()

  particles.forEach(({ id, vx, vy, x, y }) => {
    dispatch({
      type: ActionTypes.UPDATE_PARTICLE_POSITION,
      payload: {
        id,
        x: x + vx,
        y: y + vy,
      },
    })
  })
}

/**
 * Detect boundary collision and update particle velocity and position. A
 * particle always bounces towards the inside, so one left outside a canvas
 * that shrank, or resting on an edge, doesn't keep reversing.
 */
const detectParticleBoundaries = ({ dispatch, getParticles }: Store) => {
  const particles = getParticles()
  const canvas = getCanvas()

  particles.forEach((particle) => {
    if (particle.x + particle.radius >= canvas.width) {
      dispatch({
        type: ActionTypes.UPDATE_PARTICLE_HORIZONTAL_BOUNDARY,
        payload: {
          id: particle.id,
          vx: -Math.abs(particle.vx),
          x: canvas.width - particle.radius,
        },
      })
    }
    if (particle.x - particle.radius <= 0) {
      dispatch({
        type: ActionTypes.UPDATE_PARTICLE_HORIZONTAL_BOUNDARY,
        payload: {
          id: particle.id,
          vx: Math.abs(particle.vx),
          x: particle.radius,
        },
      })
    }
    if (particle.y + particle.radius >= canvas.height) {
      dispatch({
        type: ActionTypes.UPDATE_PARTICLE_VERTICAL_BOUNDARY,
        payload: {
          id: particle.id,
          vy: -Math.abs(particle.vy),
          y: canvas.height - particle.radius,
        },
      })
    }
    if (particle.y - particle.radius <= 0) {
      dispatch({
        type: ActionTypes.UPDATE_PARTICLE_VERTICAL_BOUNDARY,
        payload: {
          id: particle.id,
          vy: Math.abs(particle.vy),
          y: particle.radius,
        },
      })
    }
  })
}

/**
 * Detect collision between two particles and update particle velocities
 */
const detectParticleCollisions = ({ dispatch, getParticles }: Store) => {
  const particles = getParticles()

  particles.forEach((particleA, indexA) => {
    // Only check for collisions with particles that have a higher index,
    // otherwise the same particle is checked twice
    particles.slice(indexA + 1).forEach((particleB) => {
      const distanceX = particleB.x - particleA.x
      const distanceY = particleB.y - particleA.y
      const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2)

      if (distance - (particleA.radius + particleB.radius) < 0) {
        const velocityX = particleA.vx - particleB.vx
        const velocityY = particleA.vy - particleB.vy

        if (distanceX * velocityX + distanceY * velocityY >= 0) {
          const angle = -Math.atan2(
            particleB.y - particleA.y,
            particleB.x - particleA.x,
          )
          const rotationA = calculateRotation(particleA.vx, particleA.vy, angle)
          const rotationB = calculateRotation(particleB.vx, particleB.vy, angle)
          const collisionA = { x: rotationB.x, y: rotationA.y }
          const collisionB = { x: rotationA.x, y: rotationB.y }
          const velocityA = calculateRotation(
            collisionA.x,
            collisionA.y,
            -angle,
          )
          const velocityB = calculateRotation(
            collisionB.x,
            collisionB.y,
            -angle,
          )

          const typeA = getParticleType(particleA.type, particleB.type)
          const typeB = getParticleType(particleB.type, particleA.type)

          dispatch({
            type: ActionTypes.UPDATE_PARTICLE_COLLISION,
            payload: {
              id: particleA.id,
              type: typeA,
              vx: velocityA.x,
              vy: velocityA.y,
            },
          })
          dispatch({
            type: ActionTypes.UPDATE_PARTICLE_COLLISION,
            payload: {
              id: particleB.id,
              type: typeB,
              vx: velocityB.x,
              vy: velocityB.y,
            },
          })
        }
      }
    })
  })
}

/**
 * Clear canvas context based upon canvas width and height
 */
const clearCanvas = () => {
  const canvas = getCanvas()
  const context = getContext()

  if (!context) return

  context.clearRect(0, 0, canvas.width, canvas.height)
}

/**
 * Draw particle on canvas based on passed properties
 */
const drawParticles = ({ getParticles }: Store) => {
  const particles = getParticles()
  const context = getContext()

  if (!context) return

  // Read the colour every frame, so it follows theme changes
  const color = getComputedStyle(getCanvas()).color

  particles.forEach(({ radius, type, x, y }) => {
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)

    if (type === ParticleTypes.FILL) {
      context.fillStyle = color
      context.fill()
    }

    if (type === ParticleTypes.STROKE) {
      context.lineWidth = 1
      context.strokeStyle = color
      context.stroke()
    }

    context.closePath()
  })
}

// Utils ///////////////////////////////////////////////////////////////////////

/**
 * Get canvas element by element id
 */
const getCanvas = () => document.getElementById(GAME_ID) as HTMLCanvasElement

/**
 * Get canvas context by getCanvas() function
 */
const getContext = () => getCanvas().getContext('2d')

/**
 * Get the number of particles for the breakpoint of the passed canvas width
 */
const getParticleCount = (width: number) =>
  PARTICLE_COUNTS.find(({ minWidth }) => width >= minWidth)?.count ?? 0

/**
 * Key particles by their id, as they're kept in state
 */
const toRecord = (particles: Particle[]): Record<number, Particle> =>
  Object.fromEntries(particles.map((particle) => [particle.id, particle]))

/**
 * Calculate rotation of a point in a 2D space by using the rotation matrix
 */
const calculateRotation = (x: number, y: number, angle: number) => ({
  x: Math.round(x * Math.cos(angle) - y * Math.sin(angle)),
  y: Math.round(x * Math.sin(angle) + y * Math.cos(angle)),
})

/**
 * Get particle type by other particle type
 */
const getParticleType = (typeA: ParticleTypes, typeB: ParticleTypes) =>
  typeA === typeB ? typeA : typeB

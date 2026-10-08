import { random } from '@/lib/random'

// Types ///////////////////////////////////////////////////////////////////////

enum ActionTypes {
  CREATE_PARTICLES,
  SET_FRAME_ID,
  SET_INITIAL_STATE,
  UPDATE_PARTICLE_COLLISION,
  UPDATE_PARTICLE_HORIZONTAL_BOUNDARY,
  UPDATE_PARTICLE_POSITION,
  UPDATE_PARTICLE_VERTICAL_BOUNDARY,
}

type CreateParticlesAction = {
  type: ActionTypes.CREATE_PARTICLES
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
  | CreateParticlesAction
  | SetFrameIdAction
  | SetInitialStateAction
  | UpdateParticleCollisionAction
  | UpdateParticleHorizontalBoundaryAction
  | UpdateParticlePositionAction
  | UpdateParticleVerticalBoundaryAction

type Listener = (state: State, previousState: State) => void

type Reducer = (state: State, action: Action) => State

type State = {
  isDarkMode: boolean
  particles: Record<number, Particle>
  frameId: number
}

type Store = {
  dispatch: (action: Action) => void
  getIsDarkMode: () => boolean
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

/**
 * Main game function which creates a canvas element and appends it to the
 * passed container id. It sets the stage for the game by creating the
 * initial state and starting the render loop.
 */
export const game = (containerId: string, isDarkMode = false) => {
  const container = document.getElementById(containerId)

  if (!container)
    return () => {
      console.error('Container not found')
    }

  const reducer = createReducer({ frameId: 0, isDarkMode, particles: {} })
  const store = createStore(reducer)
  store.dispatch({ type: ActionTypes.SET_INITIAL_STATE })

  createCanvas(container)
  resizeCanvas(store)
  initialize(store)

  // Directly return finalize function in order to finalize the game
  return () => finalize(store)
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

  const getIsDarkMode = () => state.isDarkMode
  const getParticles = () => Object.values(state.particles)
  const getFrameId = () => state.frameId

  const subscribe = (listener: Listener) => {
    listeners.add(listener)
    // Directly return unsubscribe function
    return () => listeners.delete(listener)
  }

  return {
    dispatch,
    getIsDarkMode,
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
      case ActionTypes.CREATE_PARTICLES:
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
  canvas.classList.add('absolute', 'h-full', 'w-full')

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
 * Set canvas element width and height based on observer entries dimensions.
 * Update particles in state based on aforementioned dimensions.
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

        createParticles(store, width, height)
      }
    })
  })
  observer.observe(canvas)
}

/**
 * Calculate particle position based on canvas width and height
 */
const createParticles = (
  { dispatch }: Store,
  width: number,
  height: number,
) => {
  const radius = 20
  const gridSize = 100
  const gridX = Math.ceil(width / gridSize)
  const gridY = Math.ceil(height / gridSize)

  const particles: Record<number, Particle> = Object.fromEntries(
    Array.from(Array(gridX * gridY).keys()).map((id) => {
      const cellX = Math.floor(id % gridX)
      const cellY = Math.floor((id / gridX) % gridY)
      const isLeftCells = cellX < gridX / 2

      return [
        id,
        {
          id,
          radius,
          type: isLeftCells ? ParticleTypes.FILL : ParticleTypes.STROKE,
          vx: isLeftCells ? random(1, 2) : random(-1, -2),
          vy: random(-1, -5),
          x: gridSize * cellX,
          y: gridSize * cellY,
        },
      ]
    }),
  )

  dispatch({ type: ActionTypes.CREATE_PARTICLES, payload: particles })
}

/**
 * Render function which is called recursively by requestAnimationFrame, which
 * calls all functions that should be executed on every frame - ie. particle
 * position updates, collision detection, etc. You could see this as the game
 * engine.
 */
const render = (store: Store) => {
  const { dispatch } = store

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
 * Detect boundary collision and update particle velocity and position
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
          vx: -particle.vx,
          x: canvas.width - particle.radius,
        },
      })
    }
    if (particle.x - particle.radius <= 0) {
      dispatch({
        type: ActionTypes.UPDATE_PARTICLE_HORIZONTAL_BOUNDARY,
        payload: {
          id: particle.id,
          vx: -particle.vx,
          x: particle.radius,
        },
      })
    }
    if (particle.y + particle.radius >= canvas.height) {
      dispatch({
        type: ActionTypes.UPDATE_PARTICLE_VERTICAL_BOUNDARY,
        payload: {
          id: particle.id,
          vy: -particle.vy,
          y: canvas.height - particle.radius,
        },
      })
    }
    if (particle.y - particle.radius <= 0) {
      dispatch({
        type: ActionTypes.UPDATE_PARTICLE_VERTICAL_BOUNDARY,
        payload: {
          id: particle.id,
          vy: -particle.vy,
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
const drawParticles = ({ getParticles, getIsDarkMode }: Store) => {
  const particles = getParticles()
  const isDarkMode = getIsDarkMode()
  const context = getContext()

  if (!context) return

  particles.forEach(({ radius, type, x, y }) => {
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)

    if (type === ParticleTypes.FILL) {
      context.fillStyle = isDarkMode ? 'white' : 'black'
      context.fill()
    }

    if (type === ParticleTypes.STROKE) {
      context.lineWidth = 1
      context.strokeStyle = isDarkMode ? 'white' : 'black'
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

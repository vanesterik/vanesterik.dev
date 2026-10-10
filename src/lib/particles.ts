import { random } from '@/lib/random'

// Types ///////////////////////////////////////////////////////////////////////

// Everything a running game keeps track of. The render loop changes it in
// place, every frame
type State = {
  drag: Drag | null
  frameId: number
  // Ordered by id
  particles: Particle[]
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

// The particle held by the pointer, the pointer holding it, when it was
// grabbed (in performance.now() time) and where it is
type Drag = {
  particle: Particle
  pointerId: number
  startedAt: number
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

// Distance around a particle that still grabs it, so a finger can catch it
const GRAB_MARGIN = 12

// Width of the buffer other particles keep around a held particle, in radii
// of the held particle
const BUFFER_RADII = 4

// How long the buffer takes to grow from nothing to its full width, in ms
const BUFFER_GROWTH_DURATION = 500

// Fastest a thrown particle leaves the pointer, in px per frame, so it can't
// skip past a wall in one frame
const MAX_THROW_SPEED = 30

// Fastest a particle moves of its own accord, in px per frame: particles start
// out moving at most 3 across and 6 up. Faster ones, thrown or hit by a thrown
// one, slow down by SLOWDOWN per frame until they're back at this speed
const NORMAL_MAX_SPEED = 7
const SLOWDOWN = 0.98

// How often to look for a free spot for an added particle before placing it
// on top of others anyway
const PLACEMENT_ATTEMPTS = 10

/**
 * Main game function which creates a canvas element and appends it to the
 * passed container id, and starts the render loop, which draws particles once
 * the canvas has a size. Particles are drawn in the canvas's CSS colour, so a
 * theme change recolours them without a restart.
 */
export const game = (containerId: string) => {
  const container = document.getElementById(containerId)

  if (!container)
    return () => {
      console.error('Container not found')
    }

  const state: State = { drag: null, frameId: 0, particles: [] }

  createCanvas(container)
  const stopResizing = resizeCanvas(state)
  const stopDragging = dragParticles(state)
  state.frameId = requestAnimationFrame(() => render(state))

  // Return a function that stops everything the game set up, so nothing keeps
  // running once the canvas is gone
  return () => {
    stopResizing()
    stopDragging()
    cancelAnimationFrame(state.frameId)
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
const resizeCanvas = (state: State) => {
  const canvas = getCanvas()

  const observer = new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.target.id === GAME_ID) {
        const width = entry.contentRect.width
        const height = entry.contentRect.height

        canvas.setAttribute('width', `${width}`)
        canvas.setAttribute('height', `${height}`)

        updateParticleCount(state, width, height)
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
const updateParticleCount = (state: State, width: number, height: number) => {
  const { particles } = state
  const count = getParticleCount(width)

  if (particles.length === count) return

  if (particles.length === 0) {
    state.particles = createParticleGrid(count, width, height)
    return
  }

  // Particles are ordered by id, so the newest are removed first
  const kept = particles.slice(0, count)
  const nextId = Math.max(...particles.map(({ id }) => id)) + 1
  const added: Particle[] = []

  for (let index = 0; index < count - kept.length; index++) {
    const { x, y } = findFreeSpot([...kept, ...added], width, height)
    added.push(createParticle(nextId + index, x, y, width))
  }

  state.particles = [...kept, ...added]
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
 * Let the pointer grab a particle and drag it around. Grabbing a particle flips
 * its type, as a collision would. The cursor shows a grab hand over particles,
 * and a touch that lands on a particle doesn't scroll the page; one that misses
 * still does.
 */
const dragParticles = (state: State) => {
  const canvas = getCanvas()

  const updateCursor = (x: number, y: number) => {
    canvas.style.cursor = state.drag
      ? 'grabbing'
      : findParticleAt(state, x, y)
        ? 'grab'
        : ''
  }

  // Only the pointer that grabbed a particle moves or releases it, so a second
  // finger can't take it over
  const isDragging = (event: PointerEvent) =>
    state.drag?.pointerId === event.pointerId

  const onPointerDown = (event: PointerEvent) => {
    const { x, y } = getPointerPosition(event.clientX, event.clientY)
    const particle = findParticleAt(state, x, y)

    if (!particle || state.drag) return

    // Keep receiving the pointer's moves when it leaves the canvas
    canvas.setPointerCapture(event.pointerId)
    particle.type =
      particle.type === ParticleTypes.FILL
        ? ParticleTypes.STROKE
        : ParticleTypes.FILL
    state.drag = {
      particle,
      pointerId: event.pointerId,
      startedAt: performance.now(),
      x,
      y,
    }
    updateCursor(x, y)
  }

  const onPointerMove = (event: PointerEvent) => {
    const { x, y } = getPointerPosition(event.clientX, event.clientY)

    if (state.drag && isDragging(event)) {
      state.drag.x = x
      state.drag.y = y
    }
    updateCursor(x, y)
  }

  const onPointerUp = (event: PointerEvent) => {
    const { x, y } = getPointerPosition(event.clientX, event.clientY)

    if (isDragging(event)) state.drag = null
    updateCursor(x, y)
  }

  const onTouchStart = (event: TouchEvent) => {
    // The finger that just landed, not one already on the screen
    const touch = event.changedTouches[0]

    if (!touch) return

    const { x, y } = getPointerPosition(touch.clientX, touch.clientY)
    if (findParticleAt(state, x, y)) event.preventDefault()
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointercancel', onPointerUp)
  // Not passive, so it can stop the page from scrolling
  canvas.addEventListener('touchstart', onTouchStart, { passive: false })

  return () => {
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerup', onPointerUp)
    canvas.removeEventListener('pointercancel', onPointerUp)
    canvas.removeEventListener('touchstart', onTouchStart)
  }
}

/**
 * Render function which is called recursively by requestAnimationFrame, which
 * calls all functions that should be executed on every frame - ie. particle
 * position updates, collision detection, etc. You could see this as the game
 * engine.
 */
const render = (state: State) => {
  // Stop when the canvas has left the page: React removes it before it runs the
  // effect cleanup that finalizes the game, so a frame can land in between
  if (!getCanvas()) return

  updateParticlePositions(state)
  detectParticleBoundaries(state)
  detectParticleCollisions(state)
  detectHeldParticleBuffer(state)

  clearCanvas()
  drawBuffer(state)
  drawParticles(state)

  state.frameId = requestAnimationFrame(() => render(state))
}

/**
 * Update particle position by adding velocity to x and y coordinates. A
 * particle faster than normal slows down first. The particle held by the
 * pointer sits under it instead, and takes the speed it's dragged at as its
 * velocity, so letting go throws it.
 */
const updateParticlePositions = ({ drag, particles }: State) => {
  const canvas = getCanvas()

  particles.forEach((particle) => {
    const { radius, vx, vy, x, y } = particle

    // A held particle sits under the pointer, inside the canvas
    if (particle === drag?.particle) {
      particle.x = clamp(drag.x, radius, canvas.width - radius)
      particle.y = clamp(drag.y, radius, canvas.height - radius)
      // Average the last few frames' movement, so a wobble as the pointer
      // lets go doesn't spoil the throw
      Object.assign(
        particle,
        limitSpeed(
          (vx + particle.x - x) / 2,
          (vy + particle.y - y) / 2,
          MAX_THROW_SPEED,
        ),
      )
      return
    }

    const speed = Math.hypot(vx, vy)
    const slowdown =
      speed > NORMAL_MAX_SPEED
        ? Math.max(SLOWDOWN, NORMAL_MAX_SPEED / speed)
        : 1

    particle.vx = vx * slowdown
    particle.vy = vy * slowdown
    particle.x = x + particle.vx
    particle.y = y + particle.vy
  })
}

/**
 * Detect boundary collision and update particle velocity and position. A
 * particle always bounces towards the inside, so one left outside a canvas
 * that shrank, or resting on an edge, doesn't keep reversing.
 */
const detectParticleBoundaries = ({ drag, particles }: State) => {
  const canvas = getCanvas()

  particles.forEach((particle) => {
    // The pointer keeps a held particle inside the canvas
    if (particle === drag?.particle) return

    if (particle.x + particle.radius >= canvas.width) {
      particle.vx = -Math.abs(particle.vx)
      particle.x = canvas.width - particle.radius
    }
    if (particle.x - particle.radius <= 0) {
      particle.vx = Math.abs(particle.vx)
      particle.x = particle.radius
    }
    if (particle.y + particle.radius >= canvas.height) {
      particle.vy = -Math.abs(particle.vy)
      particle.y = canvas.height - particle.radius
    }
    if (particle.y - particle.radius <= 0) {
      particle.vy = Math.abs(particle.vy)
      particle.y = particle.radius
    }
  })
}

/**
 * Detect collision between two particles and update particle velocities. Each
 * collision sees the velocities left by the ones before it in the same frame.
 * The particle held by the pointer is left to detectHeldParticleBuffer.
 */
const detectParticleCollisions = ({ drag, particles }: State) => {
  particles.forEach((particleA, indexA) => {
    if (particleA === drag?.particle) return

    // Only check for collisions with particles that have a higher index,
    // otherwise the same particle is checked twice
    particles.slice(indexA + 1).forEach((particleB) => {
      if (particleB === drag?.particle) return

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

          particleA.type = typeA
          particleA.vx = velocityA.x
          particleA.vy = velocityA.y
          particleB.type = typeB
          particleB.vx = velocityB.x
          particleB.vy = velocityB.y
        }
      }
    })
  })
}

/**
 * Keep other particles out of the buffer around the particle held by the
 * pointer, which grows to BUFFER_RADII radii wide. The held particle is an
 * immovable wall: a particle moving into the buffer is mirrored off it, and
 * one inside it is pushed back to its edge, so a fast drag can't leave it
 * stuck. Neither changes type.
 */
const detectHeldParticleBuffer = ({ drag, particles }: State) => {
  if (!drag) return

  const held = drag.particle
  const bufferRadius = held.radius * getBufferRadii(drag)

  particles.forEach((particle) => {
    if (particle === held) return

    const reach = particle.radius + held.radius + bufferRadius
    const distanceX = particle.x - held.x
    const distanceY = particle.y - held.y
    const distance = Math.hypot(distanceX, distanceY)

    if (distance >= reach) return

    // Unit vector from the held particle to the other one; straight up when
    // they share a centre
    const normalX = distance === 0 ? 0 : distanceX / distance
    const normalY = distance === 0 ? -1 : distanceY / distance
    const approach = particle.vx * normalX + particle.vy * normalY
    // Only mirror a particle that moves towards the held one
    const bounce = Math.min(approach, 0) * 2

    particle.vx -= bounce * normalX
    particle.vy -= bounce * normalY
    particle.x = held.x + normalX * reach
    particle.y = held.y + normalY * reach
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
 * Draw the edge of the buffer around the particle held by the pointer, behind
 * the particles, in the canvas's buffer colour
 */
const drawBuffer = ({ drag }: State) => {
  const context = getContext()

  if (!drag || !context) return

  const held = drag.particle
  const bufferRadii = getBufferRadii(drag)

  if (bufferRadii === 0) return

  context.beginPath()
  context.arc(held.x, held.y, held.radius * (1 + bufferRadii), 0, Math.PI * 2)
  context.lineWidth = 1
  context.strokeStyle = getComputedStyle(getCanvas())
    .getPropertyValue('--buffer')
    .trim()
  context.stroke()
  context.closePath()
}

/**
 * Draw particle on canvas based on passed properties
 */
const drawParticles = ({ particles }: State) => {
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
 * Get the pointer position on the canvas from its position in the window
 */
const getPointerPosition = (clientX: number, clientY: number) => {
  const { left, top } = getCanvas().getBoundingClientRect()

  return { x: clientX - left, y: clientY - top }
}

/**
 * Find the particle closest to the passed position within its grab distance
 */
const findParticleAt = ({ particles }: State, x: number, y: number) =>
  particles
    .map((particle) => ({
      particle,
      distance: Math.hypot(particle.x - x, particle.y - y),
    }))
    .filter(
      ({ particle, distance }) => distance <= particle.radius + GRAB_MARGIN,
    )
    .sort((a, b) => a.distance - b.distance)[0]?.particle

/**
 * Get the width of the buffer around the held particle, in its radii: it grows
 * from nothing to BUFFER_RADII over BUFFER_GROWTH_DURATION, easing out
 */
const getBufferRadii = ({ startedAt }: Drag) => {
  const progress = Math.min(
    (performance.now() - startedAt) / BUFFER_GROWTH_DURATION,
    1,
  )

  return BUFFER_RADII * easeOutCubic(progress)
}

/**
 * Ease the passed progress from 0 to 1 so it starts fast and settles
 */
const easeOutCubic = (progress: number) => 1 - (1 - progress) ** 3

/**
 * Scale the passed velocity down to the passed speed if it's faster
 */
const limitSpeed = (vx: number, vy: number, maxSpeed: number) => {
  const speed = Math.hypot(vx, vy)
  const scale = speed > maxSpeed ? maxSpeed / speed : 1

  return { vx: vx * scale, vy: vy * scale }
}

/**
 * Limit the passed value to the passed range
 */
const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

/**
 * Get the number of particles for the breakpoint of the passed canvas width
 */
const getParticleCount = (width: number) =>
  PARTICLE_COUNTS.find(({ minWidth }) => width >= minWidth)?.count ?? 0

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

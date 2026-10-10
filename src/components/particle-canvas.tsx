'use client'

import { useEffect, useRef } from 'react'

import { game } from '@/lib/particles'

export const ParticleCanvas = () => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Start the game in the container and return its finalize function as the
    // effect cleanup. The game follows the theme through its canvas's CSS
    // colour, so it runs once per mount
    return game(containerRef.current)
  }, [])

  return <div className="fixed inset-0" ref={containerRef} />
}

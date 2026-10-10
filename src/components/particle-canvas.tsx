'use client'

import { useEffect } from 'react'

import { game } from '@/lib/particles'

const GAME_CONTAINER_ID = 'game-container'

export const ParticleCanvas = () => {
  useEffect(() => {
    // Trigger game function and define finalize function to be used in
    // useEffect cleanup. The game follows the theme through its canvas's CSS
    // colour, so it runs once per mount
    const finalize = game(GAME_CONTAINER_ID)

    return () => finalize()
  }, [])

  return <div className="fixed inset-0" id={GAME_CONTAINER_ID} />
}

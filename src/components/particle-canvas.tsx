'use client'

import { useTheme } from 'next-themes'
import { useEffect } from 'react'

import { game } from '@/lib/particles'

const GAME_CONTAINER_ID = 'game-container'

export const ParticleCanvas = () => {
  const { resolvedTheme } = useTheme()
  const isDarkMode = resolvedTheme === 'dark'

  useEffect(() => {
    // Trigger game function and define finalize function to be used in
    // useEffect cleanup
    const finalize = game(GAME_CONTAINER_ID, isDarkMode)

    return () => finalize()
  }, [isDarkMode])

  return <div className="fixed inset-0" id={GAME_CONTAINER_ID} />
}

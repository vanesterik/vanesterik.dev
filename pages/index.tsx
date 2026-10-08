import { useEffect } from 'react'

import { useTheme } from '@/components/theme-provider'
import { game } from '@/lib/particles'

const GAME_CONTAINER_ID = 'game-container'

export default function Index() {
  const { isDarkMode } = useTheme()

  useEffect(() => {
    // Trigger game function and define finalize function to be used in
    // useEffect cleanup
    const finalize = game(GAME_CONTAINER_ID, isDarkMode)

    return () => finalize()
  }, [isDarkMode])

  return <div className="relative h-full w-full" id={GAME_CONTAINER_ID} />
}

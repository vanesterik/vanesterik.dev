'use client'

import 'asciinema-player/dist/bundle/asciinema-player.css'

import { useEffect, useRef, useSyncExternalStore } from 'react'

import { withBasePath } from '@/lib/base-path'

// Every recording's terminal, in columns and rows; the recorder uses it too
export const TERMINAL_SIZE = { cols: 80, rows: 16 }

// A monospace cell is about 0.6em wide, and the player's lines 4/3em tall
const LINE_HEIGHT = 4 / 3
const ASPECT_RATIO = `${TERMINAL_SIZE.cols * 0.6} / ${(TERMINAL_SIZE.rows * LINE_HEIGHT).toFixed(3)}`

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

type Motion = 'unknown' | 'reduce' | 'motion'

const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED_MOTION)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

type TerminalRecordingProps = {
  recording: string
}

/**
 * An asciinema recording, looping, in a box the size of its terminal: the
 * box holds the space before the player loads, so nothing shifts, and the
 * player fits it. The player loads when this mounts, which is when its row
 * opens. The reduced-motion preference is only known in the browser, so the
 * static HTML and the first client render are the same empty box; with
 * reduced motion the player shows the last frame and waits to be started. A
 * player that fails to load leaves the box
 */
export const TerminalRecording = ({ recording }: TerminalRecordingProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const motion = useSyncExternalStore<Motion>(
    subscribe,
    () => (window.matchMedia(REDUCED_MOTION).matches ? 'reduce' : 'motion'),
    () => 'unknown',
  )

  useEffect(() => {
    const element = ref.current
    if (motion === 'unknown' || !element) return
    let dispose: (() => void) | undefined
    let cancelled = false

    import('asciinema-player')
      .then(({ create }) => {
        if (cancelled) return
        const player = create(withBasePath(recording), element, {
          ...TERMINAL_SIZE,
          loop: true,
          autoPlay: motion === 'motion',
          controls: motion === 'reduce',
          fit: 'both',
          theme: 'site',
          terminalFontFamily: 'var(--font-mono)',
          terminalLineHeight: LINE_HEIGHT,
        })
        dispose = () => player.dispose()
        if (motion === 'reduce') player.seek('100%').catch(() => {})
      })
      .catch(() => {})

    return () => {
      cancelled = true
      dispose?.()
    }
  }, [motion, recording])

  return (
    <div ref={ref} style={{ aspectRatio: ASPECT_RATIO }} className="w-full" />
  )
}

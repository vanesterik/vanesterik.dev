'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

import { withBasePath } from '@/lib/base-path'

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

type Motion = 'unknown' | 'reduce' | 'motion'

const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED_MOTION)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

type PreviewVideoProps = {
  video: string
  poster: string
  alt: string
}

/**
 * A recorded flow, muted, looping and inline, over its first frame as the
 * poster. The reduced-motion preference is only known in the browser, so the
 * static HTML and the first client render show the poster alike, and the
 * video starts after that; with reduced motion it shows controls instead. A
 * browser that refuses to play (such as an iPhone in Low Power Mode) keeps
 * the poster, with controls, so the visitor can start it
 */
export const PreviewVideo = ({ video, poster, alt }: PreviewVideoProps) => {
  const ref = useRef<HTMLVideoElement>(null)
  const [refused, setRefused] = useState(false)
  const motion = useSyncExternalStore<Motion>(
    subscribe,
    () => (window.matchMedia(REDUCED_MOTION).matches ? 'reduce' : 'motion'),
    () => 'unknown',
  )

  useEffect(() => {
    if (motion !== 'motion') return
    ref.current?.play().catch(() => setRefused(true))
  }, [motion])

  return (
    <video
      ref={ref}
      src={withBasePath(video)}
      poster={withBasePath(poster)}
      aria-label={alt}
      muted
      loop
      playsInline
      controls={motion === 'reduce' || refused}
      className="aspect-[16/10] w-full object-cover"
    />
  )
}

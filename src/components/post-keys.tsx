'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useEffectEvent } from 'react'

import { shortcutKey } from '@/lib/shortcut-key'

const postPath = (slug: string) => `/posts/${slug}/`

// J goes to the older post and K to the newer one, the pager's Previous and
// Next, as J moves down the newest-first lists; at either end the key does
// nothing. It pushes, so Back returns to the post the reader came from
export const PostKeys = ({
  previous,
  next,
}: {
  previous?: string
  next?: string
}) => {
  const router = useRouter()

  const step = useEffectEvent((event: KeyboardEvent) => {
    const key = shortcutKey(event)
    if (key !== 'j' && key !== 'k') return
    const slug = key === 'j' ? previous : next
    if (!slug) return
    event.preventDefault()
    router.push(postPath(slug))
  })
  useEffect(() => {
    window.addEventListener('keydown', step)
    return () => window.removeEventListener('keydown', step)
  }, [])

  return null
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Button } from '@/components/ui/button'

// The static export adds a trailing slash to every path but the root
const withoutTrailingSlash = (path: string) => path.replace(/(.)\/$/, '$1')

/**
 * Whether the passed URL is the page being shown, or a section above it (the
 * projects page on /projects/<slug>/); home matches only itself
 */
export const isCurrentPath = (pathname: string | null, url: string) => {
  if (pathname === null) return false
  const path = withoutTrailingSlash(pathname)
  const section = withoutTrailingSlash(url)
  return path === section || (section !== '/' && path.startsWith(`${section}/`))
}

type NavLinkProps = {
  name: string
  url: string
}

/**
 * A navigation button that shows, in the primary style, when its page is the
 * one being shown
 */
export const NavLink = ({ name, url }: NavLinkProps) => {
  const isCurrent = isCurrentPath(usePathname(), url)
  const variant = isCurrent ? 'default' : url === '/' ? 'ghost' : 'secondary'

  return (
    <Button asChild variant={variant}>
      <Link href={url} aria-current={isCurrent ? 'page' : undefined}>
        {name}
      </Link>
    </Button>
  )
}

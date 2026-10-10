import Link from 'next/link'

import { Button } from '@/components/ui/button'

type NavigationItem = {
  name: string
  url: string
}

type NavigationProps = {
  items?: NavigationItem[]
}

export const Navigation = ({ items }: NavigationProps) => {
  if (!items?.length) return null

  return (
    <nav>
      <ul className="flex flex-row gap-x-0.5">
        {items.map(({ name, url }) => (
          // Below md, MobileMenu holds the pages besides home
          <li key={name} className={url === '/' ? undefined : 'max-md:hidden'}>
            <Button asChild variant={url === '/' ? 'ghost' : 'secondary'}>
              <Link href={url}>{name}</Link>
            </Button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

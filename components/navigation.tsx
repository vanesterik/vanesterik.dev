import Link from 'next/link'
import { button } from '@/lib/styles'

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
          <li key={name}>
            <Link
              className={button({
                intent: url === '/' ? 'ghost' : 'secondary',
              })}
              href={url}
            >
              {name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

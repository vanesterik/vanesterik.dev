import Link from 'next/link'
import { button, stack } from '@/lib/styles'

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
      <ul className={stack({ direction: 'row' })}>
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

import { menu, text } from '@/lib/styles'

type LinkListItem = {
  name: string
  url: string
}

type LinkListProps = {
  items?: LinkListItem[]
}

export const LinkList = ({ items }: LinkListProps) => {
  if (!items?.length) return null

  return (
    <ul className={menu()}>
      {items.map(({ name, url }) => (
        <li key={name}>
          <a
            className={text({ intent: 'link' })}
            href={url}
            {...(isAlternativeLink(url)
              ? { target: '_self' }
              : { rel: 'noopener noreferrer', target: '_blank' })}
          >
            {name}
          </a>
        </li>
      ))}
    </ul>
  )
}

export const isAlternativeLink = (url: string) => /mailto:|tel:/.test(url)

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
    <ul className="leading-4">
      {items.map(({ name, url }) => (
        <li key={name}>
          <a
            className="font-mono text-foreground text-xs uppercase hover:text-highlight"
            href={url}
            {...getLinkTargetProps(url)}
          >
            {name}
          </a>
        </li>
      ))}
    </ul>
  )
}

export const isAlternativeLink = (url: string) => /mailto:|tel:/.test(url)

/**
 * Open email and phone links in the same tab, and other links in a new one
 */
export const getLinkTargetProps = (url: string) =>
  isAlternativeLink(url)
    ? { target: '_self' }
    : { rel: 'noopener noreferrer', target: '_blank' }

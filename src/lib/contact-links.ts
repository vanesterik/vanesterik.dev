type Link = {
  name: string
  url: string
}

/**
 * Get the about page's contact links, named for display: email, LinkedIn and
 * GitHub, taken from the footer's links in content/layout.json. A missing link
 * fails the build instead of rendering an empty one.
 */
export const getContactLinks = ({
  contact,
  social,
}: {
  contact: Link[]
  social: Link[]
}): Link[] => [
  {
    name: 'Email',
    url: findUrl(contact, ({ url }) => url.startsWith('mailto:'), 'email'),
  },
  {
    name: 'LinkedIn',
    url: findUrl(social, ({ name }) => name === 'linkedin', 'linkedin'),
  },
  {
    name: 'GitHub',
    url: findUrl(social, ({ name }) => name === 'github', 'github'),
  },
]

const findUrl = (
  links: Link[],
  matches: (link: Link) => boolean,
  description: string,
) => {
  const link = links.find(matches)

  if (!link) throw new Error(`content/layout.json has no ${description} link`)

  return link.url
}

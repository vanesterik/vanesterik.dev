import type { Element, ElementContent, RootContent, Text } from 'hast'

// Shared by the post's drawn SVGs: rehype-mermaid's diagrams and rehype-svg's
// drawings. Both end up inline in the page, so their ids must be unique on it,
// and both need a title (and maybe a description) for screen readers

export const isElement = (
  node: RootContent | ElementContent,
): node is Element => node.type === 'element'

// Ids must be unique on the page: a participant "You" becomes id="You"
export const prefixIds = (svg: Element, prefix: string) => {
  const ids = new Set<string>()
  const collect = (node: Element) => {
    if (typeof node.properties.id === 'string') {
      ids.add(node.properties.id)
      node.properties.id = prefix + node.properties.id
    }
    node.children.filter(isElement).forEach(collect)
  }
  const rewrite = (node: Element) => {
    for (const [key, value] of Object.entries(node.properties)) {
      if (typeof value !== 'string') continue
      node.properties[key] = value
        .replace(/url\(#([^)]+)\)/g, (match, id) =>
          ids.has(id) ? `url(#${prefix}${id})` : match,
        )
        .replace(/^#(.+)$/, (match, id) =>
          (key === 'href' || key === 'xLinkHref') && ids.has(id)
            ? `#${prefix}${id}`
            : match,
        )
    }
    node.children.filter(isElement).forEach(rewrite)
  }
  collect(svg)
  rewrite(svg)
}

const text = (value: string): Text => ({ type: 'text', value })

// Gives the SVG a <title> (and a <desc>) and the image role, and wraps it in a
// <figure> with the given class
export const labeledFigure = (
  svg: Element,
  {
    prefix,
    title,
    description,
    className,
  }: { prefix: string; title: string; description?: string; className: string },
): Element => {
  const labels: Element[] = [
    {
      type: 'element',
      tagName: 'title',
      properties: { id: `${prefix}title` },
      children: [text(title)],
    },
  ]
  if (description) {
    labels.push({
      type: 'element',
      tagName: 'desc',
      properties: { id: `${prefix}desc` },
      children: [text(description)],
    })
  }
  svg.properties.role = 'img'
  svg.properties.ariaLabelledBy = [`${prefix}title`]
  if (description) svg.properties.ariaDescribedBy = [`${prefix}desc`]
  svg.children.unshift(...labels)

  return {
    type: 'element',
    tagName: 'figure',
    properties: { className: [className] },
    children: [svg],
  }
}

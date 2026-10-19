import { renderMermaidSVG } from 'beautiful-mermaid'
import type { Element, ElementContent, Root, RootContent, Text } from 'hast'
import { fromHtml } from 'hast-util-from-html'

// The site's tokens, resolved by the page, so a theme switch recolors the
// diagram without drawing it again
const COLORS = {
  bg: 'var(--background)',
  fg: 'var(--foreground)',
  muted: 'var(--muted-foreground)',
  transparent: true,
}

const isElement = (node: RootContent | ElementContent): node is Element =>
  node.type === 'element'

const textOf = (node: Element): string =>
  node.children
    .map((child) =>
      child.type === 'text'
        ? child.value
        : isElement(child)
          ? textOf(child)
          : '',
    )
    .join('')

// remark-rehype turns ```mermaid into <pre><code class="language-mermaid">
const mermaidSource = (node: Element) => {
  if (node.tagName !== 'pre') return undefined
  const [code, ...rest] = node.children.filter(isElement)
  const classes = code?.properties.className
  if (rest.length || !Array.isArray(classes)) return undefined
  return classes.includes('language-mermaid') ? textOf(code) : undefined
}

// The renderer ignores Mermaid's accessibility lines, so take them out first
const splitAccessibility = (source: string) => {
  let title: string | undefined
  let description: string | undefined
  const lines = source.split('\n').filter((line) => {
    const match = /^\s*(accTitle|accDescr):(.*)$/.exec(line)
    if (!match) return true
    if (match[1] === 'accTitle') title ??= match[2].trim()
    else description ??= match[2].trim()
    return false
  })
  if (!title) throw new Error('a mermaid diagram needs an "accTitle:" line')
  return { title, description, diagram: lines.join('\n') }
}

// Drop the renderer's font imports and font rule: the page sets the font, and
// the diagram makes no third-party requests
const withoutFonts = (svg: string) =>
  svg
    .replace(/@import[^;]*;/g, '')
    .replace(/(^|\n)\s*text\s*\{\s*font-family:[^}]*\}/g, '')

// Ids must be unique on the page: a participant "You" becomes id="You"
const prefixIds = (svg: Element, prefix: string) => {
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

const drawDiagram = (source: string, number: number): Element => {
  const { title, description, diagram } = splitAccessibility(source)
  const svg = fromHtml(withoutFonts(renderMermaidSVG(diagram, COLORS)), {
    fragment: true,
  }).children.find(
    (node): node is Element => isElement(node) && node.tagName === 'svg',
  )
  if (!svg) throw new Error('a mermaid diagram rendered no SVG')

  const prefix = `mermaid-${number}-`
  prefixIds(svg, prefix)
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
    properties: { className: ['mermaid'] },
    children: [svg],
  }
}

// Draws each ```mermaid fence as an inline SVG at build time, in place of the
// code block, so the diagram needs no JavaScript in the browser
export const rehypeMermaid = () => (tree: Root) => {
  let count = 0
  const visit = (parent: Root | Element) => {
    parent.children.forEach((node, index) => {
      if (!isElement(node)) return
      const source = mermaidSource(node)
      if (source === undefined) {
        visit(node)
        return
      }
      count += 1
      parent.children[index] = drawDiagram(source, count)
    })
  }
  visit(tree)
}

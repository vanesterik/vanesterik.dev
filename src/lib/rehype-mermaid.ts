import { renderMermaidSVG } from 'beautiful-mermaid'
import type { Element, Root } from 'hast'
import { fromHtml } from 'hast-util-from-html'

import { isElement, labeledFigure, prefixIds } from './svg-figure'

// The site's tokens, resolved by the page, so a theme switch recolors the
// diagram without drawing it again. The renderer reads --line, --accent,
// --surface and --border from the page when they're not given, and the site
// has an --accent of its own, so all are set here, with the renderer's mixes
const mix = (percent: number) =>
  `color-mix(in srgb, var(--foreground) ${percent}%, var(--background))`

const COLORS = {
  bg: 'var(--background)',
  fg: 'var(--foreground)',
  muted: 'var(--muted-foreground)',
  line: mix(50),
  accent: mix(85),
  surface: mix(3),
  border: mix(20),
  transparent: true,
}

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
    .replace(/@import\s+url\([^)]*\)[^;]*;/g, '')
    .replace(/(^|\n)\s*text\s*\{\s*font-family:[^}]*\}/g, '')

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
  return labeledFigure(svg, {
    prefix,
    title,
    description,
    className: 'mermaid',
  })
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

import fs from 'node:fs'
import path from 'node:path'

import type { Element, Root } from 'hast'
import { fromHtml } from 'hast-util-from-html'

import { isElement, labeledFigure, prefixIds } from './svg-figure'

const isLocalSvg = (src: string) =>
  src.endsWith('.svg') &&
  !/^[a-z][a-z\d+.-]*:/i.test(src) &&
  !src.startsWith('/')

const readSvg = (dir: string, src: string): Element => {
  const root = path.resolve(dir)
  const file = path.resolve(root, src)
  if (!file.startsWith(root + path.sep)) {
    throw new Error(`an image must be inside the posts folder: ${src}`)
  }
  if (!fs.existsSync(file)) throw new Error(`an image needs its file: ${src}`)
  const svg = fromHtml(fs.readFileSync(file, 'utf8'), {
    fragment: true,
  }).children.find(
    (node): node is Element => isElement(node) && node.tagName === 'svg',
  )
  if (!svg) throw new Error(`an image has no <svg>: ${src}`)
  return svg
}

// The src of an <img> that is a local SVG, or undefined
const svgSource = (node: Element) => {
  const src = node.properties.src
  return node.tagName === 'img' && typeof src === 'string' && isLocalSvg(src)
    ? src
    : undefined
}

// A paragraph that holds one image and nothing else, as Markdown makes of an
// image on its own line
export const onlyImage = (node: Element) => {
  if (node.tagName !== 'p') return undefined
  const content = node.children.filter(
    (child) => !(child.type === 'text' && !child.value.trim()),
  )
  return content.length === 1 && isElement(content[0]) ? content[0] : undefined
}

// Draws a Markdown image of a local SVG (a path relative to the posts folder)
// inline at build time, in place of its paragraph, so it can use the site's
// tokens as CSS variables and recolor on a theme switch. The alt text becomes
// its <title> and the image's title its <desc>
export const rehypeSvg =
  ({ dir }: { dir: string }) =>
  (tree: Root) => {
    let count = 0
    const visit = (parent: Root | Element) => {
      parent.children.forEach((node, index) => {
        if (!isElement(node)) return
        const image = onlyImage(node)
        const src = image && svgSource(image)
        if (!image || !src) {
          const stray = svgSource(node)
          if (stray) {
            throw new Error(`an SVG image must stand on its own line: ${stray}`)
          }
          visit(node)
          return
        }
        const title = image.properties.alt
        if (typeof title !== 'string' || !title.trim()) {
          throw new Error(`an SVG image needs alt text: ${src}`)
        }
        const description = image.properties.title
        const svg = readSvg(dir, src)
        count += 1
        const prefix = `svg-${count}-`
        prefixIds(svg, prefix)
        parent.children[index] = labeledFigure(svg, {
          prefix,
          title: title.trim(),
          description:
            typeof description === 'string' && description.trim()
              ? description.trim()
              : undefined,
          className: 'drawing',
        })
      })
    }
    visit(tree)
  }

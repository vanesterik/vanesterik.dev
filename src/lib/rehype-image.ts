import fs from 'node:fs'
import path from 'node:path'

import type { Element, Root } from 'hast'
import { imageSize } from 'image-size'

import { withBasePath } from './base-path'
import { onlyImage } from './rehype-svg'
import { isElement } from './svg-figure'

const RASTER = /\.(avif|gif|jpe?g|png|webp)$/i

const isRemote = (src: string) =>
  /^[a-z][a-z\d+.-]*:/i.test(src) || src.startsWith('//')

// The path of a src without its query or hash (?v=2, #top), which the file
// on disk doesn't have
const pathOf = (src: string) => src.replace(/[?#].*$/, '')

// The src of an <img> that is a raster image on this site, or undefined
const rasterSource = (node: Element) => {
  const src = node.properties.src
  return node.tagName === 'img' &&
    typeof src === 'string' &&
    RASTER.test(pathOf(src)) &&
    !isRemote(src)
    ? src
    : undefined
}

// The file a src names in public/, decoded (Markdown percent-encodes a space
// in a file name), or undefined for a malformed escape such as %zz
const decode = (src: string) => {
  try {
    return decodeURIComponent(pathOf(src))
  } catch {
    return undefined
  }
}

// The width and height of a file in public/, failing on a path outside it, a
// missing file or one that isn't an image
const measure = (publicDir: string, src: string) => {
  if (!src.startsWith('/')) {
    throw new Error(
      `an image must be a path in public/, starting with /: ${src}`,
    )
  }
  const root = path.resolve(publicDir)
  const name = decode(src)
  const file = name && path.resolve(root, `.${name}`)
  if (file && !file.startsWith(root + path.sep)) {
    throw new Error(`an image must be inside public/: ${src}`)
  }
  if (!file || !fs.existsSync(file)) {
    throw new Error(`an image isn't in public/: ${src}`)
  }
  try {
    const { width, height } = imageSize(fs.readFileSync(file))
    return { width, height }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`an image can't be read: ${src} (${message})`)
  }
}

// Shows a Markdown image of a raster file in public/ (a path from its root,
// such as /posts/<slug>/<name>.jpg) as a <figure>, in place of its paragraph.
// It gets the file's width and height, so it holds its space while it loads,
// and the base path, which a plain <img> doesn't add by itself. The image's
// title becomes its <figcaption>
export const rehypeImage =
  ({ publicDir }: { publicDir: string }) =>
  (tree: Root) => {
    const visit = (parent: Root | Element) => {
      parent.children.forEach((node, index) => {
        if (!isElement(node)) return
        const image = onlyImage(node)
        const src = image && rasterSource(image)
        if (!image || !src) {
          const stray = rasterSource(node)
          if (stray) {
            throw new Error(`an image must stand on its own line: ${stray}`)
          }
          visit(node)
          return
        }
        const alt = image.properties.alt
        if (typeof alt !== 'string' || !alt.trim()) {
          throw new Error(`an image needs alt text: ${src}`)
        }
        const { width, height } = measure(publicDir, src)
        const caption = image.properties.title
        const children: Element[] = [
          {
            type: 'element',
            tagName: 'img',
            properties: {
              src: withBasePath(src),
              alt: alt.trim(),
              width,
              height,
              loading: 'lazy',
              decoding: 'async',
            },
            children: [],
          },
        ]
        if (typeof caption === 'string' && caption.trim()) {
          children.push({
            type: 'element',
            tagName: 'figcaption',
            properties: {},
            children: [{ type: 'text', value: caption.trim() }],
          })
        }
        parent.children[index] = {
          type: 'element',
          tagName: 'figure',
          properties: { className: ['picture'] },
          children,
        }
      })
    }
    visit(tree)
  }

import path from 'node:path'

import { toHtml } from 'hast-util-to-html'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { describe, expect, it } from 'vitest'

import { rehypeSvg } from './rehype-svg'

const dir = path.join(__dirname, '__fixtures__', 'svg')

const render = async (markdown: string) => {
  const processor = unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeSvg, { dir })
  return toHtml(await processor.run(processor.parse(markdown)))
}

const ids = (html: string) =>
  [...html.matchAll(/ id="([^"]+)"/g)].map(([, id]) => id)

const references = (html: string) =>
  [...html.matchAll(/url\(#([^)]+)\)/g)].map(([, id]) => id)

describe('rehypeSvg', () => {
  it('draws a local SVG image inline, as an accessible figure', async () => {
    const html = await render(
      '![A line](sub/drawing.svg "A line with an arrow")\n',
    )
    expect(html).toContain('<figure class="drawing"><svg')
    expect(html).toContain('role="img"')
    expect(html).toContain('aria-labelledby="svg-1-title"')
    expect(html).toContain('aria-describedby="svg-1-desc"')
    expect(html).toContain('<title id="svg-1-title">A line</title>')
    expect(html).toContain('<desc id="svg-1-desc">A line with an arrow</desc>')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<p>')
  })

  it('gives every drawing its own ids', async () => {
    const html = await render(
      '![One](sub/drawing.svg)\n\n![Two](sub/drawing.svg)\n',
    )
    expect(new Set(ids(html)).size).toBe(ids(html).length)
    const svgs = html.match(/<svg[\s\S]*?<\/svg>/g) ?? []
    expect(svgs).toHaveLength(2)
    svgs.forEach((svg, index) => {
      for (const id of ids(svg)) {
        expect(id.startsWith(`svg-${index + 1}-`)).toBe(true)
      }
      expect(references(svg)).toEqual([`svg-${index + 1}-arrow`])
    })
  })

  it('leaves other images alone', async () => {
    const html = await render(
      '![Remote](https://example.com/a.svg)\n\n![Photo](sub/photo.png)\n',
    )
    expect(html).toContain('<img src="https://example.com/a.svg" alt="Remote">')
    expect(html).toContain('<img src="sub/photo.png" alt="Photo">')
  })

  it('requires the file', async () => {
    await expect(render('![Gone](sub/missing.svg)\n')).rejects.toThrow(
      'an image needs its file: sub/missing.svg',
    )
  })

  it('requires alt text', async () => {
    await expect(render('![](sub/drawing.svg)\n')).rejects.toThrow(
      'an SVG image needs alt text: sub/drawing.svg',
    )
  })

  it('requires the image on its own line', async () => {
    await expect(render('Look: ![A line](sub/drawing.svg)\n')).rejects.toThrow(
      'an SVG image must stand on its own line: sub/drawing.svg',
    )
  })

  it("doesn't read outside the posts folder", async () => {
    await expect(render('![Out](../rehype-svg.svg)\n')).rejects.toThrow(
      'an image must be inside the posts folder: ../rehype-svg.svg',
    )
  })
})

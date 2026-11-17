import path from 'node:path'

import { toHtml } from 'hast-util-to-html'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { rehypeImage } from './rehype-image'

const publicDir = path.join(__dirname, '__fixtures__', 'public')

const render = async (markdown: string) => {
  const processor = unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeImage, { publicDir })
  return toHtml(await processor.run(processor.parse(markdown)))
}

describe('rehypeImage', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('shows an image from public/ as a figure, with its size and caption', async () => {
    const html = await render(
      '![A grey box](/posts/sample/photo.png "Just grey")\n',
    )
    expect(html).toBe(
      '<figure class="picture"><img src="/posts/sample/photo.png" alt="A grey box" width="40" height="20" loading="lazy" decoding="async"><figcaption>Just grey</figcaption></figure>',
    )
  })

  it('leaves out the caption without a title', async () => {
    const html = await render('![A grey box](/posts/sample/photo.png)\n')
    expect(html).toContain('<figure class="picture"><img')
    expect(html).not.toContain('<figcaption>')
  })

  it('prefixes the base path', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/base')
    const html = await render('![A grey box](/posts/sample/photo.png)\n')
    expect(html).toContain('src="/base/posts/sample/photo.png"')
  })

  it('leaves remote images and SVGs alone', async () => {
    const html = await render(
      '![Remote](https://example.com/a.png)\n\n![Drawn](/posts/sample/a.svg)\n',
    )
    expect(html).toContain('<img src="https://example.com/a.png" alt="Remote">')
    expect(html).toContain('<img src="/posts/sample/a.svg" alt="Drawn">')
  })

  it('requires the file in public/', async () => {
    await expect(
      render('![Gone](/posts/sample/missing.jpg)\n'),
    ).rejects.toThrow("an image isn't in public/: /posts/sample/missing.jpg")
  })

  it('finds a file with a space in its name', async () => {
    const html = await render('![A grey box](</posts/sample/my photo.png>)\n')
    expect(html).toContain(
      '<img src="/posts/sample/my%20photo.png" alt="A grey box" width="40" height="20"',
    )
  })

  it('keeps a query or hash, and measures the file without it', async () => {
    const html = await render(
      '![One](/posts/sample/photo.png?v=2)\n\n![Two](/posts/sample/photo.png#top)\n',
    )
    expect(html).toContain(
      '<img src="/posts/sample/photo.png?v=2" alt="One" width="40" height="20"',
    )
    expect(html).toContain(
      '<img src="/posts/sample/photo.png#top" alt="Two" width="40" height="20"',
    )
  })

  it('names an image it cannot read', async () => {
    await expect(render('![Bad](/posts/sample/broken.jpg)\n')).rejects.toThrow(
      "an image can't be read: /posts/sample/broken.jpg",
    )
  })

  it('requires a path from the root of public/', async () => {
    await expect(render('![Near](sample/photo.png)\n')).rejects.toThrow(
      'an image must be a path in public/, starting with /: sample/photo.png',
    )
  })

  it('requires alt text', async () => {
    await expect(render('![](/posts/sample/photo.png)\n')).rejects.toThrow(
      'an image needs alt text: /posts/sample/photo.png',
    )
  })

  it('requires the image on its own line', async () => {
    await expect(
      render('Look: ![A grey box](/posts/sample/photo.png)\n'),
    ).rejects.toThrow(
      'an image must stand on its own line: /posts/sample/photo.png',
    )
  })

  it("doesn't read outside public/", async () => {
    await expect(render('![Out](/../rehype-image.png)\n')).rejects.toThrow(
      'an image must be inside public/: /../rehype-image.png',
    )
  })
})

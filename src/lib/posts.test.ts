import path from 'node:path'

import { toHtml } from 'hast-util-to-html'
import { beforeAll, describe, expect, it } from 'vitest'

import { getAdjacentPosts, getPost, getPosts } from './posts'

const fixtures = (name: string) => path.join(__dirname, '__fixtures__', name)

describe('getPosts', () => {
  it('lists posts newest first, with the slug from the file name', () => {
    expect(getPosts(fixtures('posts')).map((post) => post.slug)).toEqual([
      'newer-post',
      'older-post',
    ])
  })

  it('turns an unquoted YAML date into YYYY-MM-DD', () => {
    const older = getPosts(fixtures('posts')).find(
      (post) => post.slug === 'older-post',
    )
    expect(older?.date).toBe('2026-01-15')
  })

  it('names the file when a field is missing', () => {
    expect(() => getPosts(fixtures('missing-title'))).toThrow(
      'no-title.md: front matter needs a "title"',
    )
  })

  it('names the file when the date is not YYYY-MM-DD', () => {
    expect(() => getPosts(fixtures('broken-date'))).toThrow(
      'bad-date.md: front matter needs a "date" as YYYY-MM-DD',
    )
  })
})

describe('getPosts order within a date', () => {
  const slugs = () => getPosts(fixtures('same-date')).map((post) => post.slug)

  it('lists the newest date first, then titles in reverse alphabetical order, whatever the file names', () => {
    expect(slugs()).toEqual([
      'c-eclair',
      'a-bananas',
      'b-apples',
      'd-apples-lower',
      'e-older',
    ])
  })
})

describe('getAdjacentPosts', () => {
  const adjacent = (slug: string) => {
    const { previous, next } = getAdjacentPosts(slug, fixtures('same-date'))
    return [previous?.slug, next?.slug]
  }

  it('gives the older post as previous and the newer post as next', () => {
    expect(adjacent('b-apples')).toEqual(['d-apples-lower', 'a-bananas'])
  })

  it('has no next for the newest post', () => {
    expect(adjacent('c-eclair')).toEqual(['a-bananas', undefined])
  })

  it('has no previous for the oldest post', () => {
    expect(adjacent('e-older')).toEqual([undefined, 'd-apples-lower'])
  })

  it('has neither for a slug that is not a post', () => {
    expect(adjacent('nope')).toEqual([undefined, undefined])
  })
})

describe('getPost', () => {
  // The first render loads Shiki's grammars, themes and engine, which can take
  // longer than one test's timeout on a cold CI runner
  beforeAll(async () => {
    await getPost('older-post', fixtures('posts'))
  }, 30_000)

  it('renders Markdown to HTML', async () => {
    const html = toHtml((await getPost('older-post', fixtures('posts'))).tree)
    expect(html).toContain('<h2>A heading</h2>')
    expect(html).toContain('<li>one</li>')
    expect(html).toContain('<code>inline</code>')
  })

  it('highlights code blocks with both themes as CSS variables', async () => {
    const html = toHtml((await getPost('older-post', fixtures('posts'))).tree)
    expect(html).toContain(
      '<pre class="shiki shiki-themes github-light github-dark"',
    )
    expect(html).toContain('--shiki-light:')
    expect(html).toContain('--shiki-dark:')
  })

  it('draws mermaid diagrams', async () => {
    const html = toHtml(
      (await getPost('newer-post', fixtures('posts'), fixtures('public'))).tree,
    )
    expect(html).toContain('<figure class="mermaid">')
    expect(html).toContain('<title id="mermaid-1-title">A greeting</title>')
  })

  it('draws SVG images inline', async () => {
    const html = toHtml(
      (await getPost('newer-post', fixtures('posts'), fixtures('public'))).tree,
    )
    expect(html).toContain('<figure class="drawing"><svg')
    expect(html).toContain('<title id="svg-1-title">A box</title>')
  })

  it('shows raster images from public/', async () => {
    const html = toHtml(
      (await getPost('newer-post', fixtures('posts'), fixtures('public'))).tree,
    )
    expect(html).toContain(
      '<figure class="picture"><img src="/posts/sample/photo.png" alt="A grey box" width="40" height="20"',
    )
  })

  it('names the file when an image is missing', async () => {
    await expect(
      getPost('broken-image', fixtures('broken-image'), fixtures('public')),
    ).rejects.toThrow(
      "broken-image.md: an image isn't in public/: /posts/sample/missing.png",
    )
  })

  it('names the file when a diagram is broken', async () => {
    await expect(
      getPost('broken-diagram', fixtures('broken-diagram')),
    ).rejects.toThrow(
      'broken-diagram.md: a mermaid diagram needs an "accTitle:" line',
    )
  })

  it('throws for an unknown slug', async () => {
    await expect(getPost('missing', fixtures('posts'))).rejects.toThrow()
  })
})

import path from 'node:path'

import { toHtml } from 'hast-util-to-html'
import { beforeAll, describe, expect, it } from 'vitest'

import { getPost, getPosts } from './posts'

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

  it('throws for an unknown slug', async () => {
    await expect(getPost('missing', fixtures('posts'))).rejects.toThrow()
  })
})

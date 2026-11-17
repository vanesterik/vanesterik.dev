import fs from 'node:fs'
import path from 'node:path'

import rehypeShiki from '@shikijs/rehype'
import matter from 'gray-matter'
import type { Root } from 'hast'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

import { rehypeImage } from './rehype-image'
import { rehypeMermaid } from './rehype-mermaid'
import { rehypeSvg } from './rehype-svg'

export type PostMeta = {
  slug: string
  title: string
  date: string
  description: string
}
// The rendered post as an HTML syntax tree, turned into React elements by
// PostContent so code blocks can become interactive components
export type Post = PostMeta & { tree: Root }

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts')
const PUBLIC_DIR = path.join(process.cwd(), 'public')
const DATE = /^\d{4}-\d{2}-\d{2}$/

// YAML reads an unquoted 2026-10-08 as a Date; keep dates as YYYY-MM-DD strings
const toDateString = (value: unknown) =>
  value instanceof Date ? value.toISOString().slice(0, 10) : value

const readPost = (dir: string, file: string) => {
  const { data, content } = matter(
    fs.readFileSync(path.join(dir, file), 'utf8'),
  )
  const date = toDateString(data.date)
  for (const field of ['title', 'description'] as const) {
    if (typeof data[field] !== 'string' || !data[field].trim()) {
      throw new Error(`${file}: front matter needs a "${field}"`)
    }
  }
  if (
    typeof date !== 'string' ||
    !DATE.test(date) ||
    Number.isNaN(Date.parse(date))
  ) {
    throw new Error(`${file}: front matter needs a "date" as YYYY-MM-DD`)
  }
  const meta: PostMeta = {
    slug: file.replace(/\.md$/, ''),
    title: data.title,
    date,
    description: data.description,
  }
  return { meta, content }
}

// Newest first; within a date, by title and then slug, both descending, so
// reading from the oldest post onwards is alphabetical. The file name plays no
// part. The collator names its locale, so every machine builds the same order.
const collator = new Intl.Collator('en')
const byNewest = (a: PostMeta, b: PostMeta) =>
  b.date.localeCompare(a.date) ||
  collator.compare(b.title, a.title) ||
  b.slug.localeCompare(a.slug)

export const getPosts = (dir = POSTS_DIR): PostMeta[] =>
  fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => readPost(dir, f).meta)
    .sort(byNewest)

// The neighbours of a post in the order of getPosts(): previous is the older
// post (next in the list), next the newer one (before it in the list)
export const getAdjacentPosts = (
  slug: string,
  dir = POSTS_DIR,
): { previous?: PostMeta; next?: PostMeta } => {
  const posts = getPosts(dir)
  const index = posts.findIndex((post) => post.slug === slug)
  if (index === -1) return {}
  return { previous: posts[index + 1], next: posts[index - 1] }
}

export const getPost = async (
  slug: string,
  dir = POSTS_DIR,
  publicDir = PUBLIC_DIR,
): Promise<Post> => {
  const { meta, content } = readPost(dir, `${slug}.md`)
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeMermaid)
    .use(rehypeSvg, { dir })
    .use(rehypeImage, { publicDir })
    .use(rehypeShiki, {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    })
  try {
    const tree = await processor.run(processor.parse(content))
    return { ...meta, tree }
  } catch (error) {
    // Name the post, as a broken front matter does, so the build says where
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`${slug}.md: ${message}`)
  }
}

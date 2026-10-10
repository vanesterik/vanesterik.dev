import fs from 'node:fs'
import path from 'node:path'

import rehypeShiki from '@shikijs/rehype'
import matter from 'gray-matter'
import type { Root } from 'hast'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

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

export const getPosts = (dir = POSTS_DIR): PostMeta[] =>
  fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => readPost(dir, f).meta)
    .sort((a, b) => b.date.localeCompare(a.date))

export const getPost = async (slug: string, dir = POSTS_DIR): Promise<Post> => {
  const { meta, content } = readPost(dir, `${slug}.md`)
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeShiki, {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    })
  const tree = await processor.run(processor.parse(content))
  return { ...meta, tree }
}

const MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
]

// Built by hand: Intl abbreviates September as "Sept" in en-GB, and parsing
// the date would bring time zones into it
export const formatPostDate = (date: string) => {
  const [year, month, day] = date.split('-')
  return `${day} ${MONTHS[Number(month) - 1]} ${year}`
}

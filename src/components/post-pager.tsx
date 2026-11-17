import Link from 'next/link'

import { formatPostDate } from '@/lib/post-date'
import type { PostMeta } from '@/lib/posts'

type PostLink = Pick<PostMeta, 'slug' | 'title' | 'date'>

type PostPagerProps = {
  previous?: PostLink
  next?: PostLink
}

const linkClass =
  'group flex flex-col gap-2 rounded-sm py-2 focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-offset-4'
const labelClass = 'font-mono text-muted-foreground text-xs uppercase'
const titleClass =
  'font-bold text-foreground text-lg leading-tight group-hover:text-highlight'

export const PostPager = ({ previous, next }: PostPagerProps) => {
  if (!previous && !next) return null

  return (
    <nav
      aria-label="More posts"
      className="mt-24 grid items-start gap-8 sm:grid-cols-2"
    >
      {previous && (
        <Link
          href={`/posts/${previous.slug}`}
          rel="prev"
          className={`${linkClass} sm:col-start-1`}
        >
          <span className={labelClass}>
            ← Previous · {formatPostDate(previous.date)}
          </span>
          <span className={titleClass}>{previous.title}</span>
        </Link>
      )}
      {next && (
        <Link
          href={`/posts/${next.slug}`}
          rel="next"
          className={`${linkClass} sm:col-start-2 sm:text-right`}
        >
          <span className={labelClass}>
            {formatPostDate(next.date)} · Next →
          </span>
          <span className={titleClass}>{next.title}</span>
        </Link>
      )}
    </nav>
  )
}

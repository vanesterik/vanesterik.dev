import Link from 'next/link'

import { formatPostDate, type PostMeta } from '@/lib/posts'

type PostListProps = {
  posts: PostMeta[]
}

export const PostList = ({ posts }: PostListProps) => {
  if (!posts.length) {
    return (
      <p className="font-mono text-muted-foreground text-xs uppercase">
        no posts yet
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-12">
      {posts.map(({ slug, title, date, description }) => (
        <li key={slug} className="flex flex-col gap-2">
          <time
            dateTime={date}
            className="font-mono text-muted-foreground text-xs uppercase"
          >
            {formatPostDate(date)}
          </time>
          <Link
            href={`/posts/${slug}`}
            className="font-bold text-2xl text-foreground leading-tight hover:text-highlight"
          >
            {title}
          </Link>
          <p className="text-muted-foreground">{description}</p>
        </li>
      ))}
    </ul>
  )
}

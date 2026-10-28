import type { Metadata } from 'next'

import { PostContent } from '@/components/post-content'
import { formatPostDate } from '@/lib/post-date'
import { getPost, getPosts } from '@/lib/posts'

type PageProps = {
  params: Promise<{ slug: string }>
}

export const dynamicParams = false

export const generateStaticParams = () =>
  getPosts().map(({ slug }) => ({ slug }))

export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { title, description } = await getPost((await params).slug)
  return { title, description }
}

export default async function Page({ params }: PageProps) {
  const { title, date, tree } = await getPost((await params).slug)

  return (
    <article className="mx-auto w-full max-w-160">
      <header className="mb-12 flex flex-col gap-4">
        <time
          dateTime={date}
          className="font-mono text-muted-foreground text-xs uppercase"
        >
          {formatPostDate(date)}
        </time>
        {/* 36px on a phone, where 48px leaves a word or two per line */}
        <h1 className="font-bold text-4xl text-foreground leading-tight sm:text-5xl">
          {title}
        </h1>
      </header>
      <div className="prose">
        <PostContent tree={tree} />
      </div>
    </article>
  )
}

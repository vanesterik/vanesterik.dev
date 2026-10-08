import type { Metadata } from 'next'

import { formatPostDate, getPost, getPosts } from '@/lib/posts'

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
  const { title, date, html } = await getPost((await params).slug)

  return (
    <article className="mx-auto w-full max-w-160">
      <header className="mb-12 flex flex-col gap-4">
        <time
          dateTime={date}
          className="font-mono text-muted-foreground text-xs uppercase"
        >
          {formatPostDate(date)}
        </time>
        <h1 className="font-bold text-5xl text-foreground leading-tight">
          {title}
        </h1>
      </header>
      <div
        className="prose"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: the HTML is built from the repository's own Markdown at build time
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  )
}

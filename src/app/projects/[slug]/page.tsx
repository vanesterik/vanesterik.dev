import type { Metadata } from 'next'

import { getProjects } from '@/lib/projects'

import { ProjectsPage } from '../projects-page'

type PageProps = {
  params: Promise<{ slug: string }>
}

export const dynamicParams = false

export const generateStaticParams = () =>
  getProjects().map(({ slug }) => ({ slug }))

// The same page as /projects/, so that's the canonical one
export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { slug } = await params
  const project = getProjects().find((item) => item.slug === slug)
  return {
    title: `${project?.name} · Projects`,
    alternates: { canonical: '/projects/' },
  }
}

export default function Page() {
  return <ProjectsPage />
}

import { Fragment } from 'react'

import { getLinkTargetProps } from '@/components/link-list'
import type { Project, ProjectType } from '@/lib/projects'

const PRIMARY_LABELS: Record<ProjectType, string> = {
  web: 'visit site',
  cli: 'install',
  lib: 'npm',
  zsh: 'install',
  ml: 'results',
}

// Label column and spacing shared by both lists
const LIST = 'grid grid-cols-[6rem_1fr] content-start gap-x-4 gap-y-1'

const withoutProtocol = (url: string) => url.replace(/^https?:\/\//, '')

type ProjectDetailsProps = {
  project: Project
}

/**
 * A project's description as a large lead, with two columns of small
 * definition pairs beneath it: its facts, and its links by address. The
 * columns stack on narrow screens
 */
export const ProjectDetails = ({ project }: ProjectDetailsProps) => {
  const { type, description, stack, role, year, links } = project
  const items = [
    { label: PRIMARY_LABELS[type], url: links.primary },
    { label: 'source', url: links.source },
    { label: 'write-up', url: links.writeup },
  ].filter((item): item is { label: string; url: string } => Boolean(item.url))

  return (
    <div className="flex flex-col gap-6">
      {/* The one large, heavy line in the panel, between the small rows and
          summaries; set like a post's title */}
      <p className="font-bold font-sans text-4xl leading-tight sm:text-5xl">
        {description}
      </p>
      {/* Lausanne like the description, in regular at a small size */}
      <div className="grid gap-6 font-sans text-sm sm:grid-cols-2">
        <dl className={LIST}>
          <dt className="text-muted-foreground">stack</dt>
          <dd>{stack.join(' · ')}</dd>
          <dt className="text-muted-foreground">role</dt>
          <dd>{role}</dd>
          <dt className="text-muted-foreground">year</dt>
          <dd>{year}</dd>
        </dl>
        {items.length > 0 && (
          <dl className={LIST}>
            {items.map(({ label, url }) => (
              <Fragment key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="truncate">
                  <a
                    className="hover:text-highlight"
                    href={url}
                    {...getLinkTargetProps(url)}
                  >
                    {withoutProtocol(url)}
                  </a>
                </dd>
              </Fragment>
            ))}
          </dl>
        )}
      </div>
    </div>
  )
}

'use client'

import { cn } from 'cn'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { BrowserFrame } from '@/components/browser-frame'
import { ProjectDetails } from '@/components/project-details'
import { ProjectStatus } from '@/components/project-status'
import { TerminalFrame } from '@/components/terminal-frame'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { withBasePath } from '@/lib/base-path'
import type { Project } from '@/lib/projects'

// Name, type, year and the status dot; narrow enough for a phone as well
const COLUMNS = 'grid grid-cols-[1fr_3rem_3rem_1rem] gap-x-4'

// A screenshot in the browser frame, or in the terminal frame for a terminal
// app; otherwise a terminal session; or nothing
const ProjectPreview = ({ project }: { project: Project }) => {
  const { name, url, preview } = project
  const alt = `Screenshot of ${name}`

  if (preview.image && preview.frame === 'terminal') {
    return <TerminalFrame name={name} image={preview.image} alt={alt} />
  }
  if (preview.image) {
    return <BrowserFrame url={url} image={preview.image} alt={alt} />
  }
  if (preview.terminal) {
    return <TerminalFrame name={name} lines={preview.terminal} />
  }
  return null
}

/**
 * The project a path names, /projects/<slug>/, or '' for none
 */
export const openSlugFromPath = (pathname: string | null, slugs: string[]) => {
  const slug = /^\/projects\/([^/]+)\/?$/.exec(pathname ?? '')?.[1]
  return slug && slugs.includes(slug) ? slug : ''
}

const isProjectsPath = (pathname: string | null) =>
  pathname !== null && /^\/projects(\/|$)/.test(pathname)

type ProjectIndexProps = {
  projects: Project[]
}

/**
 * The projects as an ls -l style table, without borders or a header: one row
 * per project, which opens to a preview and details. One row is open at a
 * time, and on the projects page the address decides which: /projects/<slug>/
 * opens that row, and opening or closing a row replaces the address
 */
export const ProjectIndex = ({ projects }: ProjectIndexProps) => {
  const pathname = usePathname()
  const fromPath = openSlugFromPath(
    pathname,
    projects.map(({ slug }) => slug),
  )
  const list = useRef<HTMLDivElement>(null)

  // Opens a clicked row at once, before the router passes on the new path,
  // and follows the path when it changes (Back, Forward, the navigation)
  const [open, setOpen] = useState(fromPath)
  const [lastPath, setLastPath] = useState(fromPath)
  if (fromPath !== lastPath) {
    setLastPath(fromPath)
    setOpen(fromPath)
  }

  const change = (slug: string) => {
    setOpen(slug)
    // Only on the projects page: Storybook's preview keeps its own address
    if (!isProjectsPath(pathname)) return
    window.history.replaceState(
      null,
      '',
      withBasePath(slug ? `/projects/${slug}/` : '/projects/'),
    )
  }

  // A deep link scrolls its row into view, clear of the sticky header
  // biome-ignore lint/correctness/useExhaustiveDependencies: only on the first render
  useEffect(() => {
    if (!fromPath) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    list.current
      ?.querySelector(`[data-slug="${fromPath}"]`)
      ?.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' })
  }, [])

  return (
    <div ref={list} className="font-mono">
      <Accordion type="single" collapsible value={open} onValueChange={change}>
        {projects.map((project) => (
          <AccordionItem
            key={project.slug}
            value={project.slug}
            data-slug={project.slug}
          >
            <AccordionTrigger
              className={cn(
                COLUMNS,
                // The header and footer's text style, rounded and padded like
                // their buttons
                'min-h-11 items-baseline rounded px-2 py-3.5 text-xs uppercase hover:bg-secondary',
              )}
            >
              <span>{project.name}</span>
              <span className="text-muted-foreground">{project.type}</span>
              <span>{project.year}</span>
              <span className="justify-self-end">
                <ProjectStatus status={project.status} />
              </span>
            </AccordionTrigger>
            {/* A hairline under an open panel eases the step back into the rows */}
            <AccordionContent className="flex flex-col gap-8 border-accent border-b pt-2 pb-8">
              <ProjectPreview project={project} />
              <ProjectDetails project={project} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}

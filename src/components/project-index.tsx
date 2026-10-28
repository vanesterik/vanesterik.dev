'use client'

import { cn } from 'cn'
import { usePathname } from 'next/navigation'
import { useEffect, useEffectEvent, useRef, useState } from 'react'

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
import { type Project, projectTitle } from '@/lib/projects'

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

  // The title names the open project too, so a bookmark does: the address
  // changes without a new page, and Back restores an entry's first title
  const openName = projects.find(({ slug }) => slug === open)?.name
  const onProjectsPath = isProjectsPath(pathname)
  useEffect(() => {
    if (!onProjectsPath) return
    document.title = openName ? projectTitle(openName) : 'Projects'
  }, [onProjectsPath, openName])

  // J and K open the next and the previous project, as in a mail or feed
  // reader, to browse a long list from the keyboard; with none open they
  // start at the first and the last. A shortcut with Cmd, Ctrl or Alt stays
  // the browser's, and a text field keeps its letters
  const step = useEffectEvent((event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return
    const key = event.key.toLowerCase()
    if (key !== 'j' && key !== 'k') return
    const { target } = event
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable || target.closest('input, textarea, select'))
    ) {
      return
    }
    event.preventDefault()

    const slugs = projects.map(({ slug }) => slug)
    const index = slugs.indexOf(open)
    const slug =
      key === 'j'
        ? slugs[index + 1]
        : slugs[index === -1 ? slugs.length - 1 : index - 1]
    if (!slug) return
    change(slug)
    // Focus follows, so a screen reader announces the row; the snap scrolls
    list.current
      ?.querySelector<HTMLElement>(
        `[data-slug="${slug}"] [data-slot="accordion-trigger"]`,
      )
      ?.focus({ preventScroll: true })
  })
  useEffect(() => {
    window.addEventListener('keydown', step)
    return () => window.removeEventListener('keydown', step)
  }, [])

  // A row that opens, by a click or a deep link, snaps to the top of the
  // page, clear of the sticky header; after the render, so a row closing
  // above it has already moved it
  useEffect(() => {
    if (!open) return
    list.current
      ?.querySelector(`[data-slug="${open}"]`)
      ?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [open])

  return (
    <div ref={list} className="font-mono">
      <Accordion type="single" collapsible value={open} onValueChange={change}>
        {projects.map((project) => (
          <AccordionItem
            key={project.slug}
            value={project.slug}
            data-slug={project.slug}
            // The open row, its preview and details framed together in a
            // rounded hairline, with room inside and space around; on wide
            // screens it breaks out of the column. Snapped to the top, it
            // stops its margin's height below the window's edge, the scroll
            // padding (md:scroll-pt-24) less 2rem, so the row above it is out
            // of view rather than showing under the header
            className={cn(
              'rounded-lg md:-scroll-mt-8',
              'data-[state=open]:my-16 data-[state=open]:border data-[state=open]:border-accent data-[state=open]:p-4 sm:data-[state=open]:p-6',
              'lg:data-[state=open]:-mx-24',
            )}
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
            <AccordionContent className="flex flex-col gap-8 pt-2">
              <ProjectPreview project={project} />
              <ProjectDetails project={project} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}

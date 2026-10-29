import path from 'node:path'

import { ProjectIndex } from '@/components/project-index'
import { checkProjectFiles } from '@/lib/project-files'
import { getProjects } from '@/lib/projects'

/**
 * The projects page, at /projects/ and at /projects/<slug>/, where
 * ProjectIndex opens the row the path names. A screenshot or video missing
 * from public/ fails the build
 */
export const ProjectsPage = () => {
  const projects = getProjects()
  checkProjectFiles(projects, path.join(process.cwd(), 'public'))

  return (
    <div className="mx-auto w-full max-w-160">
      {/* Nothing visible precedes the table, so the heading is only for
          screen readers */}
      <h1 className="sr-only">Projects</h1>
      <ProjectIndex projects={projects} />
    </div>
  )
}

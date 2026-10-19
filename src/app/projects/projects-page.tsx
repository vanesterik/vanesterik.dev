import { ProjectIndex } from '@/components/project-index'
import { getProjects } from '@/lib/projects'

/**
 * The projects page, at /projects/ and at /projects/<slug>/, where
 * ProjectIndex opens the row the path names
 */
export const ProjectsPage = () => (
  <div className="mx-auto w-full max-w-160">
    {/* Nothing visible precedes the table, so the heading is only for
        screen readers */}
    <h1 className="sr-only">Projects</h1>
    <ProjectIndex projects={getProjects()} />
  </div>
)

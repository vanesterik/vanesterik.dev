import fs from 'node:fs'
import path from 'node:path'

import type { Project } from './projects'

/**
 * Fail when a file a project's preview names, its screenshot or video, isn't
 * in public/, named by the project's slug. Node only: getProjects() stays
 * safe in the browser, so the projects pages run this when they build
 */
export const checkProjectFiles = (projects: Project[], publicDir: string) => {
  for (const { slug, preview } of projects) {
    for (const file of [preview.image, preview.video]) {
      if (file !== undefined && !fs.existsSync(path.join(publicDir, file))) {
        throw new Error(
          `content/projects.json: ${slug}: "${file}" isn't in public/`,
        )
      }
    }
  }
}

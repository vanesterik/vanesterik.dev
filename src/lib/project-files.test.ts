import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { beforeAll, describe, expect, it } from 'vitest'

import { checkProjectFiles } from './project-files'
import { getProjects } from './projects'

const project = (preview: Record<string, unknown>) => ({
  slug: 'lorem',
  type: 'web',
  name: 'lorem',
  stack: ['next.js'],
  year: 2026,
  status: 'live',
  role: 'author',
  description: 'Lorem ipsum.',
  preview,
  links: {},
})

let publicDir: string

beforeAll(() => {
  publicDir = fs.mkdtempSync(path.join(os.tmpdir(), 'public-'))
  fs.mkdirSync(path.join(publicDir, 'projects'))
  fs.writeFileSync(path.join(publicDir, 'projects', 'a.jpg'), '')
})

describe('checkProjectFiles', () => {
  it('passes the files that are in public/', () => {
    const projects = getProjects([project({ image: '/projects/a.jpg' })])
    expect(() => checkProjectFiles(projects, publicDir)).not.toThrow()
  })

  it('fails on a file that is missing, named by the project', () => {
    const projects = getProjects([
      project({ image: '/projects/a.jpg', video: '/projects/a.mp4' }),
    ])
    expect(() => checkProjectFiles(projects, publicDir)).toThrow(
      'content/projects.json: lorem: "/projects/a.mp4" isn\'t in public/',
    )
  })

  it('fails on a recording that is missing', () => {
    const projects = getProjects([
      { ...project({ recording: '/projects/a.cast' }), type: 'cli' },
    ])
    expect(() => checkProjectFiles(projects, publicDir)).toThrow(
      'content/projects.json: lorem: "/projects/a.cast" isn\'t in public/',
    )
  })

  it('finds every file the real projects name', () => {
    expect(() =>
      checkProjectFiles(getProjects(), path.join(process.cwd(), 'public')),
    ).not.toThrow()
  })
})

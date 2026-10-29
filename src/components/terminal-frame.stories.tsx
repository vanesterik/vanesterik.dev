import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { getProjects } from '@/lib/projects'

import { TerminalFrame } from './terminal-frame'

// The first project with a terminal session, and the first with a terminal
// app screenshot, whichever they are
const projects = getProjects()
const session = projects.find(({ preview }) => preview.terminal)
const screenshot = projects.find(({ preview }) => preview.frame === 'terminal')

// Typed without the component: its props are a union (lines or a
// screenshot), which Storybook can't infer args from
const meta = {
  title: 'terminal-frame',
  decorators: [
    (Story) => (
      <div className="w-160">
        <Story />
      </div>
    ),
  ],
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

// Stays dark in the light theme too
export const Session: Story = {
  render: () => (
    <TerminalFrame
      name={session?.name ?? 'session'}
      lines={session?.preview.terminal ?? []}
    />
  ),
}

export const Screenshot: Story = {
  render: () => (
    <TerminalFrame
      name={screenshot?.name ?? 'screenshot'}
      image={screenshot?.preview.image ?? ''}
      alt={`Screenshot of ${screenshot?.name}`}
    />
  ),
}

// A recording of a real run, looping; it loads when the story opens
export const Recording: Story = {
  render: () => (
    <TerminalFrame
      name="zsh-git-alias"
      recording="/projects/zsh-git-alias.cast"
    />
  ),
}

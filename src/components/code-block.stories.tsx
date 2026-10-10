import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { CodeBlock } from './code-block'

const meta = {
  component: CodeBlock,
  // Posts render code blocks inside the prose styling. Highlighting happens
  // when posts are built, so the code here is plain
  decorators: [
    (Story) => (
      <div className="prose w-160">
        <Story />
      </div>
    ),
  ],
  args: {
    children: <code>{'npm install\nnpm run dev'}</code>,
  },
} satisfies Meta<typeof CodeBlock>

export default meta

type Story = StoryObj<typeof meta>

// Hover the block, or tab to it, to show the copy button
export const Default: Story = {}

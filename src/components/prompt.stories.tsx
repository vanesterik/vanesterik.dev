import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Prompt } from './prompt'

const meta = {
  component: Prompt,
} satisfies Meta<typeof Prompt>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

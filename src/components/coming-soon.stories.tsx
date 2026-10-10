import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ComingSoon } from './coming-soon'

const meta = {
  component: ComingSoon,
} satisfies Meta<typeof ComingSoon>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

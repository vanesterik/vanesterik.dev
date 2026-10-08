import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Button } from './button'

const meta = {
  component: Button,
  args: { children: 'about' },
} satisfies Meta<typeof Button>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Secondary: Story = {
  args: { variant: 'secondary' },
}

export const Ghost: Story = {
  args: { variant: 'ghost' },
}

export const AsLink: Story = {
  args: {
    asChild: true,
    variant: 'secondary',
    children: <a href="/about">about</a>,
  },
}

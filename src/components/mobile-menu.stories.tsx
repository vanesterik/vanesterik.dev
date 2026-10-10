import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import layout from '@/content/layout.json'

import { MobileMenu } from './mobile-menu'

const meta = {
  component: MobileMenu,
  args: { items: layout.menu },
} satisfies Meta<typeof MobileMenu>

export default meta

type Story = StoryObj<typeof meta>

export const Closed: Story = {}

export const Open: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'menu' }))
  },
}

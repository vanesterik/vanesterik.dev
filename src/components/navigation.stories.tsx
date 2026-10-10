import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import layout from '@/content/layout.json'

import { Navigation } from './navigation'

const meta = {
  component: Navigation,
  args: { items: layout.menu },
} satisfies Meta<typeof Navigation>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

// Below md only home shows; MobileMenu holds the other pages
export const OnPhone: Story = {
  globals: {
    viewport: { value: 'mobile1', isRotated: false },
  },
}

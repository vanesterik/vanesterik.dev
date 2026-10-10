import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import layout from '@/content/layout.json'

import { LinkList } from './link-list'

const meta = {
  component: LinkList,
} satisfies Meta<typeof LinkList>

export default meta

type Story = StoryObj<typeof meta>

// The footer's email link, which opens in the same tab
export const Contact: Story = {
  args: { items: layout.contact },
}

// The footer's social links, which open in a new tab
export const Social: Story = {
  args: { items: layout.social },
}

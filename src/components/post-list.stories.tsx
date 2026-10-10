import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { PostList } from './post-list'

const meta = {
  component: PostList,
  decorators: [
    (Story) => (
      <div className="w-160">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PostList>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    posts: [
      {
        slug: 'shipping-image-datasets-off-a-mac',
        title: 'Shipping image datasets off a Mac without the junk',
        date: '2026-10-08',
        description:
          'A small tar toolkit for moving image datasets off a Mac without .DS_Store and ._ files tagging along.',
      },
      {
        slug: 'an-older-post',
        title: 'An older post',
        date: '2026-01-15',
        description: 'A second post, to show the spacing between them.',
      },
    ],
  },
}

export const Empty: Story = {
  args: { posts: [] },
}

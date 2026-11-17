import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { PostPager } from './post-pager'

const oldest = {
  slug: 'shipping-image-datasets-off-a-mac',
  title: 'Shipping image datasets off a Mac without the junk',
  date: '2026-10-08',
}
const newest = {
  slug: 'stopping-claude-from-grading-its-own-homework',
  title: 'Stopping Claude from grading its own homework',
  date: '2026-11-16',
}

const meta = {
  component: PostPager,
  decorators: [
    (Story) => (
      <div className="w-160">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PostPager>

export default meta

type Story = StoryObj<typeof meta>

export const BothLinks: Story = {
  args: { previous: oldest, next: newest },
}

// The oldest post
export const OnlyNext: Story = {
  args: { next: newest },
}

// The newest post
export const OnlyPrevious: Story = {
  args: { previous: oldest },
}

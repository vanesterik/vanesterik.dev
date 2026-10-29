import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { BrowserFrame } from './browser-frame'

const meta = {
  component: BrowserFrame,
  decorators: [
    (Story) => (
      <div className="w-160 font-mono">
        <Story />
      </div>
    ),
  ],
  args: {
    url: 'https://www.sportsdirect.com/',
    image: '/projects/sports-direct.jpg',
    alt: 'Screenshot of Sports Direct',
  },
} satisfies Meta<typeof BrowserFrame>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

// A recorded flow, playing over its first frame
export const WithVideo: Story = {
  args: {
    url: 'https://www.ayvens.com/nl-nl/zakelijk-leasen-showroom/',
    image: '/projects/leaseplan.jpg',
    video: '/projects/leaseplan.mp4',
    alt: 'Recording of LeasePlan',
  },
}

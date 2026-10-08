import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import layout from '@/content/layout.json'

import { ThemeProvider } from './theme-provider'
import { ThemeSelector } from './theme-selector'

const meta = {
  component: ThemeSelector,
  args: { options: layout.theme },
  decorators: [
    (Story) => (
      <ThemeProvider
        attribute="data-theme"
        defaultTheme="system"
        enableSystem
        storageKey="storybook-theme"
      >
        <Story />
      </ThemeProvider>
    ),
  ],
} satisfies Meta<typeof ThemeSelector>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

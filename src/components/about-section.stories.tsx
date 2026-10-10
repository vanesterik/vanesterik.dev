import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import about from '@/content/about.json'

import { AboutSection } from './about-section'

const meta = {
  component: AboutSection,
  // The section's margins and sizes are relative to the about page's text
  decorators: [
    (Story) => (
      <div className="w-[45vw]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AboutSection>

export default meta

type Story = StoryObj<typeof meta>

// Working Experience: large items with a period under each
export const Default: Story = {
  args: {
    title: 'Working Experience',
    children: about.experience.slice(0, 3).map(({ title, company, period }) => (
      <li key={`${company} ${period}`}>
        <p>{title}</p>
        <p>{company}</p>
        <p className="mt-[0.4em] font-mono text-muted-foreground text-xs uppercase">
          {period}
        </p>
      </li>
    )),
  },
}

// Companies I Worked With and Get In Touch: small, muted items
export const Compact: Story = {
  args: {
    title: 'Companies I Worked With',
    isCompact: true,
    children: about.companies.map((company) => (
      <li key={company}>{company}</li>
    )),
  },
}

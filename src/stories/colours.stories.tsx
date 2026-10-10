import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { COLOR_PAIRS, COLOR_TOKENS } from './tokens'
import { readToken, useThemeClass } from './use-theme-class'

const Colours = () => {
  useThemeClass()

  return (
    <div className="flex flex-col gap-12 font-mono text-foreground text-xs uppercase">
      <section className="flex flex-col gap-4">
        <h2>Tokens</h2>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-6">
          {COLOR_TOKENS.map((name) => (
            <li key={name} className="flex flex-col gap-1">
              <div
                className="mb-1 h-20 rounded border border-accent"
                style={{ background: `var(--${name})` }}
              />
              <p>{name}</p>
              <p className="text-muted-foreground normal-case">
                {readToken(name)}
              </p>
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-4">
        <h2>Text on background</h2>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-6">
          {COLOR_PAIRS.map(({ text, background }) => (
            <li
              key={`${text} ${background}`}
              className="flex flex-col gap-2 rounded border border-accent p-4"
              style={{
                background: `var(--${background})`,
                color: `var(--${text})`,
              }}
            >
              <p className="font-sans text-2xl normal-case">Live to learn.</p>
              <p>
                {text} on {background}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

const meta = {
  title: 'Design tokens/Colours',
  component: Colours,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Colours>

export default meta

type Story = StoryObj<typeof meta>

// Switch light and dark in the toolbar to see each theme's values
export const Default: Story = {}

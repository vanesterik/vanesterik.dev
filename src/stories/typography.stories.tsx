import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useEffect, useRef, useState } from 'react'

import layout from '@/content/layout.json'

import { FONTS, TEXT_SIZES } from './tokens'

const SAMPLE = layout.tagline.join(' ')

// A text size's sample, labelled with the size it renders at
const TextSize = ({ className, use }: (typeof TEXT_SIZES)[number]) => {
  const sample = useRef<HTMLParagraphElement>(null)
  const [size, setSize] = useState('')

  useEffect(() => {
    if (!sample.current) return
    const { fontSize, lineHeight } = getComputedStyle(sample.current)
    setSize(`${fontSize} / ${lineHeight}`)
  }, [])

  return (
    <li className="flex flex-col gap-2">
      <p className="font-mono text-xs uppercase">
        {className} <span className="text-muted-foreground">{size}</span>
      </p>
      <p className="font-mono text-muted-foreground text-xs">{use}</p>
      <p ref={sample} className={`${className} truncate`}>
        {layout.tagline[0]}
      </p>
    </li>
  )
}

const Typography = () => (
  <div className="flex flex-col gap-12 text-foreground">
    <section className="flex flex-col gap-6">
      <h2 className="font-mono text-xs uppercase">Fonts</h2>
      {FONTS.map(({ name, className, weights }) =>
        weights.map((weight) => (
          <div key={`${name} ${weight.name}`} className="flex flex-col gap-2">
            <p className="font-mono text-xs uppercase">
              {name} {weight.name}{' '}
              <span className="text-muted-foreground">
                {className} {weight.className}
              </span>
            </p>
            <p className={`${className} ${weight.className} text-2xl`}>
              {SAMPLE}
            </p>
          </div>
        )),
      )}
    </section>
    <section className="flex flex-col gap-6">
      <h2 className="font-mono text-xs uppercase">Text sizes</h2>
      <ul className="flex flex-col gap-8">
        {TEXT_SIZES.map((size) => (
          <TextSize key={size.className} {...size} />
        ))}
      </ul>
    </section>
  </div>
)

const meta = {
  title: 'Design tokens/Typography',
  component: Typography,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Typography>

export default meta

type Story = StoryObj<typeof meta>

// text-item and text-intro scale with the window, so their sizes depend on
// its width
export const Default: Story = {}

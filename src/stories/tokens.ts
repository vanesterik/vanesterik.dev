// The design tokens the Storybook token pages show. The colors are defined in
// src/app/globals.css; a test keeps this list in step with it

export const COLOR_TOKENS = [
  'background',
  'foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'accent',
  'buffer',
  'highlight',
  'highlight-foreground',
  'muted-foreground',
] as const

export type ColorToken = (typeof COLOR_TOKENS)[number]

// Text colors as the site sets them on their backgrounds
export const COLOR_PAIRS: { text: ColorToken; background: ColorToken }[] = [
  { text: 'foreground', background: 'background' },
  { text: 'muted-foreground', background: 'background' },
  { text: 'primary-foreground', background: 'primary' },
  { text: 'secondary-foreground', background: 'secondary' },
  { text: 'highlight-foreground', background: 'highlight' },
]

export const FONTS = [
  {
    name: 'Lausanne',
    className: 'font-sans',
    weights: [
      { name: 'regular', className: 'font-normal' },
      { name: 'bold', className: 'font-bold' },
    ],
  },
  {
    name: 'NB International Pro Mono',
    className: 'font-mono',
    weights: [{ name: 'regular', className: 'font-normal' }],
  },
]

// The text sizes the site uses, smallest first
export const TEXT_SIZES = [
  { className: 'text-xs', use: 'Labels: dates, periods, buttons, the footer' },
  { className: 'text-base', use: 'Body text and subtext' },
  { className: 'text-2xl', use: 'Post titles in the posts list' },
  { className: 'text-item', use: 'About page items' },
  { className: 'text-intro', use: 'About page introduction and headings' },
  { className: 'text-8xl', use: 'Coming soon' },
]

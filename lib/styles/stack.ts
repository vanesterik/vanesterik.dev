import { cva } from 'class-variance-authority'

export const stack = cva(['flex'], {
  variants: {
    direction: {
      row: ['flex-row', 'gap-x-0.5'],
      column: ['flex-col', 'gap-y-0.5'],
    },
    justify: {
      start: ['justify-start'],
      end: ['justify-end'],
      between: ['justify-between'],
    },
  },
  compoundVariants: [
    {
      direction: 'row',
      justify: 'between',
      class: 'gap-x-0',
    },
    {
      direction: 'column',
      justify: 'between',
      class: 'gap-y-0',
    },
  ],
  defaultVariants: {
    direction: 'column',
  },
})

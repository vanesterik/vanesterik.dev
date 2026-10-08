import { cva } from 'class-variance-authority'

export const dropdown = cva(['relative'])

export const dropdownList = cva(
  [
    'absolute',
    'mt-0.5',
    'overflow-hidden',
    'rounded',
    'w-32',
    'focus:outline-hidden',
  ],
  {
    variants: {
      side: {
        left: ['left-0'],
        right: ['right-0'],
      },
    },
    defaultVariants: {
      side: 'left',
    },
  },
)

export const dropdownListItem = cva([
  'cursor-pointer',
  'flex-row',
  'flex',
  'font-mono',
  'font-normal',
  'gap-x-0.5',
  'items-center',
  'leading-8',
  'px-2',
  'relative',
  'select-none',
  'text-xs',
  'uppercase',
  'bg-secondary/80',
  'text-secondary-foreground',
  'hover:bg-accent',
  'active:bg-highlight',
  'active:text-highlight-foreground',
])

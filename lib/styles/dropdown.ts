import { cva } from 'class-variance-authority'

export const dropdown = cva(['relative'])

export const dropdownList = cva(
  [
    'absolute',
    'mt-0.5',
    'overflow-hidden',
    'rounded',
    'w-32',
    'focus:outline-none',
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
  'text-black',
  'bg-primary-200/80',
  'active:bg-secondary-500',
  'active:text-black',
  'dark:active:bg-secondary-500',
  'dark:active:fill-black',
  'dark:active:text-black',
  'dark:bg-primary-800/80',
  'dark:fill-white',
  'dark:hover:bg-primary-800',
  'dark:text-white',
  'hover:bg-primary-300',
])

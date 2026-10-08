import { cva } from 'class-variance-authority'

export const button = cva(
  [
    'flex',
    'flex-row',
    'font-mono',
    'font-normal',
    'gap-x-0.5',
    'h-8',
    'items-center',
    'pt-[1px]',
    'px-2',
    'rounded',
    'text-xs',
    'uppercase',
  ],
  {
    variants: {
      intent: {
        primary: [
          'bg-black',
          'text-white',
          'active:bg-secondary-500',
          'active:text-black',
          'dark:active:bg-secondary-500',
          'dark:active:text-black',
          'dark:bg-white',
          'dark:text-black',
          'hover:bg-primary-800',
        ],
        secondary: [
          'bg-primary-200/80',
          'text-black',
          'active:bg-secondary-500',
          'active:text-black',
          'dark:active:bg-secondary-500',
          'dark:active:text-black',
          'dark:bg-primary-800/80',
          'dark:hover:bg-primary-800',
          'dark:text-white',
          'hover:bg-primary-200',
        ],
        ghost: [
          'bg-none',
          'text-black',
          'active:bg-secondary-500',
          'active:text-black',
          'dark:active:bg-secondary-500',
          'dark:active:text-black',
          'dark:hover:bg-primary-800',
          'dark:text-white',
          'hover:bg-primary-200',
        ],
      },
    },
    defaultVariants: {
      intent: 'primary',
    },
  },
)

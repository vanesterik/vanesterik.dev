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
    'active:bg-highlight',
    'active:text-highlight-foreground',
  ],
  {
    variants: {
      intent: {
        primary: [
          'bg-primary',
          'text-primary-foreground',
          'hover:bg-primary/80',
        ],
        secondary: [
          'bg-secondary/80',
          'text-secondary-foreground',
          'hover:bg-secondary',
        ],
        ghost: ['text-foreground', 'hover:bg-secondary'],
      },
    },
    defaultVariants: {
      intent: 'primary',
    },
  },
)

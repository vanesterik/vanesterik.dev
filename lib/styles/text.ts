import { cva } from 'class-variance-authority'

export const text = cva([], {
  variants: {
    intent: {
      footnote: [
        'font-mono',
        'font-normal',
        'text-primary-300',
        'text-xs',
        'uppercase',
        'dark:text-primary-700',
      ],
      label: [
        'font-mono',
        'font-normal',
        'text-black',
        'text-xs',
        'uppercase',
        'dark:text-white',
      ],
      link: [
        'font-mono',
        'text-black',
        'text-xs',
        'uppercase',
        'dark:hover:text-secondary-500',
        'dark:text-white',
        'hover:text-secondary-500',
      ],
    },
  },
})

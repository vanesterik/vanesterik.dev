import { cva, type VariantProps } from 'class-variance-authority'

export const icon = cva(['font-icon', 'text-base', 'text-foreground'], {
  variants: {
    name: {
      sun: "before:content-['1']",
      moon: "before:content-['2']",
      snowflake: "before:content-['3']",
    },
  },
})

export type IconVariant = VariantProps<typeof icon>['name']

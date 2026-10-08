import '../app/globals.css'

import { withThemeByClassName } from '@storybook/addon-themes'
import type { Preview, ReactRenderer } from '@storybook/nextjs-vite'

import { lausanne, nbInternationalProMono } from '../app/fonts'

// The theme's font tokens resolve these variables on <html>, as the layout does
document.documentElement.classList.add(
  lausanne.variable,
  nbInternationalProMono.variable,
)

const preview: Preview = {
  decorators: [
    withThemeByClassName<ReactRenderer>({
      themes: { light: '', dark: 'dark' },
      defaultTheme: 'light',
    }),
  ],
  parameters: {
    layout: 'centered',
  },
}

export default preview

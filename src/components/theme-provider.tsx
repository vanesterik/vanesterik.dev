'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ComponentProps } from 'react'

// The site's theme settings live here, not in the root layout: a server
// component can only pass serialisable props, and a value imported from this
// client module reaches it as a reference, not as the object. Callers can
// still override them, as the Storybook story does with `attribute`.
export const ThemeProvider = ({
  attribute = 'class',
  defaultTheme = 'system',
  enableSystem = true,
  ...props
}: ComponentProps<typeof NextThemesProvider>) => (
  <NextThemesProvider
    attribute={attribute}
    defaultTheme={defaultTheme}
    enableSystem={enableSystem}
    {...props}
  />
)

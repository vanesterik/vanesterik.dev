'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ComponentProps } from 'react'

// The site's theme settings live here, not in the root layout: a server
// component can only pass serialisable props, and a value imported from this
// client module reaches it as a reference, not as the object. Callers can
// still override them, as the Storybook story does with `attribute`.
//
// next-themes sets the theme before the first paint with an inline script.
// It only has to run in the static HTML; rendered in the browser (tests,
// Storybook) React won't run it and warns about it, unless it's typed as data.
// The script already suppresses the hydration warning the type change causes.
const scriptProps = {
  type: typeof window === 'undefined' ? 'text/javascript' : 'application/json',
}

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
    scriptProps={scriptProps}
    {...props}
  />
)

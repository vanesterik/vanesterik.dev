'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ComponentProps } from 'react'

// Shared by the root layout and the tests, so the tests check the real setup
export const themeProviderProps = {
  attribute: 'class',
  defaultTheme: 'system',
  enableSystem: true,
} as const

export const ThemeProvider = (
  props: ComponentProps<typeof NextThemesProvider>,
) => <NextThemesProvider {...props} />

export { useTheme } from 'next-themes'

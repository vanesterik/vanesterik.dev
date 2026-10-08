'use client'

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react'

enum Theme {
  Dark = 'dark',
  Light = 'light',
  System = 'system',
}

type ThemeContextProps = {
  isDarkMode: boolean
  setTheme: (theme: Theme) => void
  theme: Theme
}

const ThemeContext = createContext<ThemeContextProps>({
  isDarkMode: false,
  setTheme: () => Theme,
  theme: Theme.System,
})

type ThemeProviderProps = {
  children: ReactNode
}

/**
 * Theme provider function in order to get and set theme based on either system
 * preference or user preference set in local storage. This hook also takes care
 * of initially setting the theme without a flash of the default theme.
 */
export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [theme, setTheme] = useState<Theme>(Theme.System)

  // Set initial theme based on system preference
  useEffect(() => {
    const matchMedia = window.matchMedia('(prefers-color-scheme: dark)')
    setIsDarkMode(matchMedia.matches)
  }, [])

  // Set theme based on user preference
  useEffect(() => {
    const matchMedia = window.matchMedia('(prefers-color-scheme: dark)')

    // Set theme based on system preference change
    const onMediaChange = (event: MediaQueryListEvent) => {
      if (theme === Theme.System) {
        setIsDarkMode(event.matches)
      }
    }
    matchMedia.addEventListener('change', onMediaChange)

    // Set theme based on user preference change
    switch (theme) {
      case Theme.Dark:
        setIsDarkMode(true)
        break
      case Theme.Light:
        setIsDarkMode(false)
        break
      case Theme.System:
        setIsDarkMode(matchMedia.matches)
        break
    }

    // Cleanup
    return () => {
      matchMedia.removeEventListener('change', onMediaChange)
    }
  }, [theme])

  // Toggle dark mode on to document element
  useEffect(
    () =>
      isDarkMode
        ? document.documentElement.classList.add('dark')
        : document.documentElement.classList.remove('dark'),
    [isDarkMode],
  )

  return (
    <ThemeContext.Provider value={{ isDarkMode, setTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)

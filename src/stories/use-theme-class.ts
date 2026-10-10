import { useSyncExternalStore } from 'react'

const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
  return () => observer.disconnect()
}

/**
 * Re-render when Storybook's toolbar switches the theme class on <html>, so
 * values read from the CSS follow the theme
 */
export const useThemeClass = () =>
  useSyncExternalStore(
    subscribe,
    () => document.documentElement.className,
    () => '',
  )

/**
 * Read a CSS custom property's current value from <html>
 */
export const readToken = (name: string) =>
  getComputedStyle(document.documentElement)
    .getPropertyValue(`--${name}`)
    .trim()

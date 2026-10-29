import { cn } from 'cn'
import type { ReactNode } from 'react'

type FooterProps = {
  children?: ReactNode
}

export const Footer = ({ children }: FooterProps) => (
  <footer
    className={cn(
      'z-10 pt-36 pb-3 md:pt-12',
      // At the bottom of the page as it flows, except over the home page's
      // particles, where it stays in view at every size and lets clicks
      // through except on its own links and buttons
      'home:pointer-events-none home:sticky home:bottom-0 home:[&_a]:pointer-events-auto home:[&_button]:pointer-events-auto',
    )}
  >
    {children}
  </footer>
)

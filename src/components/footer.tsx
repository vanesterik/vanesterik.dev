import type { ReactNode } from 'react'

type FooterProps = {
  children?: ReactNode
}

export const Footer = ({ children }: FooterProps) => (
  <footer className="z-10 pt-36 pb-3 md:pointer-events-none md:pt-12 md:sticky md:bottom-0 md:[&_a]:pointer-events-auto md:[&_button]:pointer-events-auto">
    {children}
  </footer>
)

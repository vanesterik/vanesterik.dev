import type { ReactNode } from 'react'

type FooterProps = {
  children?: ReactNode
}

export const Footer = ({ children }: FooterProps) => (
  <footer className="z-10 grid grid-cols-[3.5rem_auto] gap-8 pt-12 pb-3 md:sticky md:bottom-0">
    {children}
  </footer>
)

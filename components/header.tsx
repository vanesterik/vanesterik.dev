import type { ReactNode } from 'react'

type HeaderProps = {
  children?: ReactNode
}

export const Header = ({ children }: HeaderProps) => (
  <header className="z-10 pt-3 pb-12 md:pointer-events-none md:sticky md:top-0 md:[&_a]:pointer-events-auto md:[&_button]:pointer-events-auto">
    <div className="flex flex-row justify-between">{children}</div>
  </header>
)

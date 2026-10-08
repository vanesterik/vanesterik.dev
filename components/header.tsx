import type { ReactNode } from 'react'

type HeaderProps = {
  children?: ReactNode
}

export const Header = ({ children }: HeaderProps) => (
  <header className="z-10 pt-3 pb-12 md:sticky md:top-0">
    <div className="flex flex-row justify-between">{children}</div>
  </header>
)

import { cn } from 'cn'
import type { ReactNode } from 'react'

type HeaderProps = {
  children?: ReactNode
}

export const Header = ({ children }: HeaderProps) => (
  <header
    className={cn(
      'z-10 pt-3 pb-12',
      // In view from md up, and over the home page's particles at every size,
      // letting clicks through except on its own links and buttons
      'md:pointer-events-none md:sticky md:top-0 md:[&_a]:pointer-events-auto md:[&_button]:pointer-events-auto',
      'home:pointer-events-none home:sticky home:top-0 home:[&_a]:pointer-events-auto home:[&_button]:pointer-events-auto',
    )}
  >
    <div className="flex flex-row justify-between">{children}</div>
  </header>
)

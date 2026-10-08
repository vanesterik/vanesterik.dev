import type { ReactNode } from 'react'
import { header, stack } from '@/lib/styles'

type HeaderProps = {
  children?: ReactNode
}

export const Header = ({ children }: HeaderProps) => (
  <header className={header()}>
    <div className={stack({ direction: 'row', justify: 'between' })}>
      {children}
    </div>
  </header>
)

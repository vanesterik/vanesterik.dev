import type { ReactNode } from 'react'
import { footer } from '@/lib/styles'

type FooterProps = {
  children?: ReactNode
}

export const Footer = ({ children }: FooterProps) => (
  <footer className={footer()}>{children}</footer>
)

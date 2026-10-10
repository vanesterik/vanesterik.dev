import type { ReactNode } from 'react'

type AboutSectionProps = {
  title: string
  // The section's <li> elements
  children: ReactNode
}

export const AboutSection = ({ title, children }: AboutSectionProps) => (
  <section className="mt-[6.5em] font-bold text-intro">
    <h2>{title}</h2>
    <ul className="mt-[1.2em] flex flex-col gap-[1.2em] pl-[2.4em] text-item">
      {children}
    </ul>
  </section>
)

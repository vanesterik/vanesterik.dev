import type { Metadata } from 'next'

import { AboutSection } from '@/components/about-section'
import { getLinkTargetProps } from '@/components/link-list'
import about from '@/content/about.json'
import layout from '@/content/layout.json'
import { getContactLinks } from '@/lib/contact-links'

export const metadata: Metadata = {
  title: 'About',
}

export default function Page() {
  return (
    <div className="md:mr-[10%] md:ml-[45%]">
      {/* The large introduction isn't a heading, so the page's heading is only
          for screen readers */}
      <h1 className="sr-only">About</h1>
      <div className="flex flex-col gap-[1.15em] font-bold text-intro">
        <p>{about.intro}</p>
        <p>{`${layout.tagline.join(' ')} ${about.afterTagline}`}</p>
      </div>
      <AboutSection title="Working Experience">
        {about.experience.map(({ title, company, period }) => (
          <li key={`${company} ${period}`}>
            <p>{title}</p>
            <p>{company}</p>
            <p className="mt-[0.4em] font-mono font-normal text-muted-foreground text-xs uppercase">
              {period}
            </p>
          </li>
        ))}
      </AboutSection>
      <AboutSection title="Companies I Worked With">
        {about.companies.map((company) => (
          <li key={company}>{company}</li>
        ))}
      </AboutSection>
      <AboutSection title="Get In Touch">
        {getContactLinks(layout).map(({ name, url }) => (
          <li key={name}>
            <a
              className="hover:text-highlight"
              href={url}
              {...getLinkTargetProps(url)}
            >
              {name}
            </a>
          </li>
        ))}
      </AboutSection>
    </div>
  )
}

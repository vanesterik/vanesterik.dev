import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import layout from '@/content/layout.json'

import Page from './page'

const getSectionItems = (name: string) => {
  const section = screen
    .getByRole('heading', { level: 2, name })
    .closest('section') as HTMLElement
  return within(section).getAllByRole('listitem')
}

describe('About page', () => {
  it('has a page heading for screen readers', () => {
    render(<Page />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'About' }),
    ).toBeInTheDocument()
  })

  it('introduces Koen as an applied data scientist', () => {
    render(<Page />)
    expect(
      screen.getByText(/^I’m an applied data scientist with a master’s degree/),
    ).toBeInTheDocument()
  })

  it('opens the second paragraph with the tagline from the layout content', () => {
    render(<Page />)
    expect(
      screen.getByText((_, element) =>
        Boolean(
          element?.tagName === 'P' &&
            element.textContent?.startsWith(
              `${layout.tagline.join(' ')} That loop`,
            ),
        ),
      ),
    ).toBeInTheDocument()
  })

  it('lists working experience, one line per company, newest first', () => {
    render(<Page />)
    const roles = getSectionItems('Working Experience')
    expect(roles).toHaveLength(9)
    expect(roles[0]).toHaveTextContent(
      'Data ScientistProvincie Utrecht2026 – Present',
    )
    expect(roles[8]).toHaveTextContent('Creative InternTribal DDB Shanghai2012')
    // Both Lab Digital lines are there
    expect(
      roles.filter((role) => role.textContent?.includes('Lab Digital')),
    ).toHaveLength(2)
  })

  it('lists the companies Koen worked with', () => {
    render(<Page />)
    const companies = getSectionItems('Companies I Worked With')
    expect(companies).toHaveLength(11)
    expect(companies.map((company) => company.textContent)).toContain(
      'Nutricia',
    )
  })

  it('links email, LinkedIn and GitHub to the layout content', () => {
    render(<Page />)
    const links = getSectionItems('Get In Touch').map((item) =>
      within(item).getByRole('link'),
    )
    expect(links.map((link) => link.textContent)).toEqual([
      'Email',
      'LinkedIn',
      'GitHub',
    ])
    expect(links[0]).toHaveAttribute('href', layout.contact[0].url)
    expect(links[0]).toHaveAttribute('target', '_self')
    expect(links[1]).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/kdesterik/',
    )
    expect(links[1]).toHaveAttribute('target', '_blank')
    expect(links[1]).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('has only the three agreed sections', () => {
    render(<Page />)
    expect(
      screen
        .getAllByRole('heading', { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual(['Working Experience', 'Companies I Worked With', 'Get In Touch'])
  })
})

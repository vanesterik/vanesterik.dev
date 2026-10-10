import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AboutSection } from './about-section'

describe('AboutSection', () => {
  it('renders its title as a level-2 heading', () => {
    render(
      <AboutSection title="Companies I Worked With">
        <li>Toyota</li>
      </AboutSection>,
    )
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Companies I Worked With',
      }),
    ).toBeInTheDocument()
  })

  it('renders its items in a list', () => {
    render(
      <AboutSection title="Companies I Worked With">
        <li>Toyota</li>
        <li>Hanno</li>
      </AboutSection>,
    )
    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual(['Toyota', 'Hanno'])
  })
})

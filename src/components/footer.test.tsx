import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Footer } from './footer'

describe('Footer', () => {
  it('should render as expected', () => {
    const { getByRole } = render(<Footer />)
    expect(getByRole('contentinfo')).toBeInTheDocument()
  })

  it('stays at the bottom over the home page at every size, letting clicks through', () => {
    const { getByRole } = render(<Footer />)
    expect(getByRole('contentinfo')).toHaveClass(
      'home:sticky',
      'home:bottom-0',
      'home:pointer-events-none',
      'home:[&_a]:pointer-events-auto',
      'home:[&_button]:pointer-events-auto',
    )
  })
})

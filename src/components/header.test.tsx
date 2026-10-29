import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Header } from './header'

describe('Header', () => {
  it('should render as expected', () => {
    const { getByRole } = render(<Header />)
    expect(getByRole('banner')).toBeInTheDocument()
  })

  it('stays at the top over the home page at every size, letting clicks through', () => {
    const { getByRole } = render(<Header />)
    expect(getByRole('banner')).toHaveClass(
      'home:sticky',
      'home:top-0',
      'home:pointer-events-none',
      'home:[&_a]:pointer-events-auto',
      'home:[&_button]:pointer-events-auto',
    )
  })
})

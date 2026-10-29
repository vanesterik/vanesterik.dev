import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Footer } from './footer'

describe('Footer', () => {
  it('should render as expected', () => {
    const { getByRole } = render(<Footer />)
    expect(getByRole('contentinfo')).toBeInTheDocument()
  })
})

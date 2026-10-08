import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Prompt } from './prompt'

describe('Prompt', () => {
  // @todo Refactor to use `getByText` instead of `container`
  it('should render as expected', () => {
    const { container } = render(<Prompt />)
    expect(container).toMatchSnapshot()
  })
})

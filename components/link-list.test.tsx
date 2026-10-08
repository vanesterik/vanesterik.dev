import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { isAlternativeLink, LinkList } from './link-list'

describe('LinkList', () => {
  it('should render as expected', () => {
    const { getByRole } = render(
      <LinkList items={[{ name: 'Foo Bar', url: '/foo/bar/' }]} />,
    )
    expect(getByRole('list')).toBeInTheDocument()
    expect(getByRole('listitem')).toBeInTheDocument()
    expect(getByRole('link')).toBeInTheDocument()
  })

  it('should render empty component if items array is empty', () => {
    const { container } = render(<LinkList items={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('should render empty component if no items array is passed', () => {
    const { container } = render(<LinkList />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('isMailLink', () => {
  it.each([
    [true, 'mailto:foo@bar.baz'],
    [true, 'tel:1234567890'],
    [false, 'http://foo.bar'],
    [false, 'https://foo.bar'],
  ])('should return %s if url is %s', (expected: boolean, url: string) => {
    expect(isAlternativeLink(url)).toBe(expected)
  })
})

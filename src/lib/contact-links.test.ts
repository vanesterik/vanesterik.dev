import { describe, expect, it } from 'vitest'

import { getContactLinks } from './contact-links'

const layout = {
  contact: [{ name: 'koen@vanesterik.dev', url: 'mailto:koen@vanesterik.dev' }],
  social: [
    { name: 'github', url: 'https://github.com/vanesterik' },
    { name: 'linkedin', url: 'https://www.linkedin.com/in/kdesterik/' },
  ],
}

describe('getContactLinks', () => {
  it('names email, LinkedIn and GitHub for display, in that order', () => {
    expect(getContactLinks(layout)).toEqual([
      { name: 'Email', url: 'mailto:koen@vanesterik.dev' },
      { name: 'LinkedIn', url: 'https://www.linkedin.com/in/kdesterik/' },
      { name: 'GitHub', url: 'https://github.com/vanesterik' },
    ])
  })

  it('fails, naming the link, when one is missing', () => {
    expect(() =>
      getContactLinks({ ...layout, social: [layout.social[0]] }),
    ).toThrow('content/layout.json has no linkedin link')
    expect(() => getContactLinks({ ...layout, contact: [] })).toThrow(
      'content/layout.json has no email link',
    )
  })
})

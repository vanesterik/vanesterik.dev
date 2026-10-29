import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BrowserFrame } from './browser-frame'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('BrowserFrame', () => {
  it('prefixes the screenshot with the base path the site is served under', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/vanesterik.dev')
    render(
      <BrowserFrame
        image="/projects/placeholder.svg"
        alt="Screenshot of lorem"
      />,
    )
    expect(
      screen.getByRole('img', { name: 'Screenshot of lorem' }),
    ).toHaveAttribute('src', '/vanesterik.dev/projects/placeholder.svg')
  })

  it('shows the screenshot with its alt text', () => {
    render(
      <BrowserFrame
        url="https://lorem.example.com"
        image="/projects/placeholder.svg"
        alt="Screenshot of lorem"
      />,
    )
    const image = screen.getByRole('img', { name: 'Screenshot of lorem' })
    expect(image).toHaveAttribute('src', '/projects/placeholder.svg')
    expect(image).toHaveAttribute('loading', 'lazy')
  })

  it('shows the URL without its protocol', () => {
    render(
      <BrowserFrame
        url="https://lorem.example.com"
        image="/projects/placeholder.svg"
        alt="Screenshot of lorem"
      />,
    )
    expect(screen.getByText('lorem.example.com')).toBeInTheDocument()
  })

  it('plays a video in place of the screenshot', () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
    const { container } = render(
      <BrowserFrame
        image="/projects/placeholder.svg"
        video="/projects/placeholder.mp4"
        alt="Recording of lorem"
      />,
    )
    expect(container.querySelector('video')).toHaveAttribute(
      'src',
      '/projects/placeholder.mp4',
    )
    expect(screen.queryByRole('img')).toBeNull()
  })
})

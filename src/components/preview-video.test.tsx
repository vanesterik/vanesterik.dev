import { render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PreviewVideo } from './preview-video'

// jsdom has neither media queries nor playback
const stubReducedMotion = (reduce: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query === '(prefers-reduced-motion: reduce)',
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

const play = vi.fn()

beforeEach(() => {
  stubReducedMotion(false)
  play.mockReset().mockResolvedValue(undefined)
  HTMLMediaElement.prototype.play = play
})

afterEach(() => {
  vi.unstubAllEnvs()
})

const renderVideo = () =>
  render(
    <PreviewVideo
      video="/projects/a.mp4"
      poster="/projects/a.jpg"
      alt="Recording of lorem"
    />,
  ).container.querySelector('video') as HTMLVideoElement

describe('PreviewVideo', () => {
  it('plays muted, looping and inline, with the screenshot as its poster', () => {
    const video = renderVideo()
    expect(video.muted).toBe(true)
    expect(video).toHaveAttribute('loop')
    expect(video).toHaveAttribute('playsinline')
    expect(video).toHaveAttribute('src', '/projects/a.mp4')
    expect(video).toHaveAttribute('poster', '/projects/a.jpg')
    expect(video).toHaveAttribute('aria-label', 'Recording of lorem')
    expect(video).toHaveClass('aspect-[16/10]', 'w-full', 'object-cover')
    expect(video).not.toHaveAttribute('controls')
    expect(play).toHaveBeenCalledOnce()
  })

  it('with reduced motion, waits for the visitor to start it', () => {
    stubReducedMotion(true)
    const video = renderVideo()
    expect(play).not.toHaveBeenCalled()
    expect(video).toHaveAttribute('controls')
  })

  it('keeps the poster, with controls, when the browser refuses to play', async () => {
    // An iPhone in Low Power Mode refuses; the visitor can still start it
    play.mockRejectedValue(new DOMException('', 'NotAllowedError'))
    const video = renderVideo()
    await waitFor(() => expect(video).toHaveAttribute('controls'))
    expect(play).toHaveBeenCalledOnce()
    expect(video).toHaveAttribute('poster', '/projects/a.jpg')
  })

  it('prefixes the video and poster with the base path', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/vanesterik.dev')
    const video = renderVideo()
    expect(video).toHaveAttribute('src', '/vanesterik.dev/projects/a.mp4')
    expect(video).toHaveAttribute('poster', '/vanesterik.dev/projects/a.jpg')
  })
})

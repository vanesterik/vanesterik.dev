import { render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TERMINAL_SIZE } from '@/lib/terminal-size'

import { TerminalRecording } from './terminal-recording'

const player = vi.hoisted(() => ({
  create: vi.fn(),
  dispose: vi.fn(),
  seek: vi.fn(),
}))

vi.mock('asciinema-player', () => ({ create: player.create }))

// jsdom has no media queries
const stubReducedMotion = (reduce: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query === '(prefers-reduced-motion: reduce)',
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

beforeEach(() => {
  stubReducedMotion(false)
  player.dispose.mockReset()
  player.seek.mockReset().mockResolvedValue(undefined)
  player.create.mockReset().mockReturnValue({
    dispose: player.dispose,
    seek: player.seek,
  })
})

afterEach(() => {
  vi.unstubAllEnvs()
  // Back to the working player after the offline test
  vi.resetModules()
  vi.doMock('asciinema-player', () => ({ create: player.create }))
})

const box = (container: HTMLElement) => container.firstChild as HTMLElement

describe('TerminalRecording', () => {
  it('holds a placeholder the size of an 80 by 16 terminal', () => {
    expect(TERMINAL_SIZE).toEqual({ cols: 80, rows: 16 })
    const { container } = render(
      <TerminalRecording recording="/projects/a.cast" />,
    )
    expect(box(container).style.aspectRatio).toBe('54.08 / 21.333')
  })

  it('loads the player looping and playing, at the recording size', async () => {
    const { container } = render(
      <TerminalRecording recording="/projects/a.cast" />,
    )
    await waitFor(() => expect(player.create).toHaveBeenCalledOnce())
    const [src, element, options] = player.create.mock.calls[0]
    expect(src).toBe('/projects/a.cast')
    expect(element).toBe(box(container))
    expect(options).toMatchObject({
      cols: 80,
      rows: 16,
      loop: true,
      autoPlay: true,
      fit: 'width',
      controls: false,
      theme: 'site',
    })
  })

  it('with reduced motion, shows the last frame and waits', async () => {
    stubReducedMotion(true)
    render(<TerminalRecording recording="/projects/a.cast" />)
    await waitFor(() => expect(player.create).toHaveBeenCalledOnce())
    expect(player.create.mock.calls[0][2]).toMatchObject({
      autoPlay: false,
      controls: true,
    })
    expect(player.seek).toHaveBeenCalledWith('100%')
  })

  it('keeps the placeholder when the player fails to load', async () => {
    // Offline after the page loaded
    vi.resetModules()
    vi.doMock('asciinema-player', () => {
      throw new Error('offline')
    })
    const { container } = render(
      <TerminalRecording recording="/projects/a.cast" />,
    )
    // A rejection left unhandled would fail the run
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(player.create).not.toHaveBeenCalled()
    expect(box(container).style.aspectRatio).not.toBe('')
  })

  it('disposes the player when its row closes', async () => {
    const { unmount } = render(
      <TerminalRecording recording="/projects/a.cast" />,
    )
    await waitFor(() => expect(player.create).toHaveBeenCalledOnce())
    unmount()
    expect(player.dispose).toHaveBeenCalledOnce()
  })

  it('prefixes the recording with the base path', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/vanesterik.dev')
    render(<TerminalRecording recording="/projects/a.cast" />)
    await waitFor(() => expect(player.create).toHaveBeenCalledOnce())
    expect(player.create.mock.calls[0][0]).toBe(
      '/vanesterik.dev/projects/a.cast',
    )
  })
})

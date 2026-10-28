import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TerminalFrame } from './terminal-frame'

const lines = [
  { text: 'ipsum pack ./lorem', tone: 'command' },
  { text: 'scanning 12,480 files …', tone: 'info' },
  { text: 'skipped 316 dolor entries', tone: 'warn' },
  { text: 'wrote lorem.tar.zst', tone: 'success' },
] as const

describe('TerminalFrame', () => {
  it('names the session after the project', () => {
    render(<TerminalFrame name="ipsum" lines={[...lines]} />)
    expect(screen.getByText('zsh — ipsum')).toBeInTheDocument()
  })

  it('prefixes commands and colors each line by its tone', () => {
    render(<TerminalFrame name="ipsum" lines={[...lines]} />)
    expect(screen.getByText('$ ipsum pack ./lorem')).toHaveClass(
      'text-foreground',
    )
    expect(screen.getByText('scanning 12,480 files …')).toHaveClass(
      'text-muted-foreground',
    )
    expect(screen.getByText('skipped 316 dolor entries')).toHaveClass(
      'text-warning',
    )
    expect(screen.getByText('wrote lorem.tar.zst')).toHaveClass('text-success')
  })

  it('wraps a line too long for a phone, even within a word', () => {
    render(<TerminalFrame name="ipsum" lines={[...lines]} />)
    expect(screen.getByText('wrote lorem.tar.zst').closest('pre')).toHaveClass(
      'whitespace-pre-wrap',
      'wrap-break-word',
    )
  })

  it('stays dark in either theme and ends on a prompt', () => {
    const { container } = render(
      <TerminalFrame name="ipsum" lines={[...lines]} />,
    )
    expect(container.firstChild).toHaveClass('dark')
    expect(container.querySelector('pre')?.lastChild).toHaveTextContent(/^\$/)
  })

  it('shows a screenshot of a terminal app instead of lines', () => {
    const { container } = render(
      <TerminalFrame
        name="froopyland"
        image="/projects/froopyland.png"
        alt="Screenshot of froopyland"
      />,
    )
    expect(screen.queryByText('zsh — froopyland')).toBeNull()
    expect(
      screen.getByRole('img', { name: 'Screenshot of froopyland' }),
    ).toHaveAttribute('src', '/projects/froopyland.png')
    expect(container.querySelector('pre')).toBeNull()
  })

  it('runs a screenshot to the edges, without a title', () => {
    const { container } = render(
      <TerminalFrame
        name="froopyland"
        image="/projects/froopyland.png"
        alt="Screenshot of froopyland"
      />,
    )
    // The screenshot already shows a terminal, so no padding or title; the
    // browser frame's border, in the page's own theme
    expect(container.firstChild).toHaveClass(
      'overflow-hidden',
      'border',
      'border-accent',
    )
    expect(container.firstChild).not.toHaveClass('p-4')
    expect(container.firstChild).not.toHaveClass('dark')
  })
})

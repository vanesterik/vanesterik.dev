import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CodeBlock } from './code-block'

const setClipboard = (clipboard: Partial<Clipboard> | undefined) => {
  Object.defineProperty(navigator, 'clipboard', {
    value: clipboard,
    configurable: true,
  })
}

const renderBlock = () =>
  render(
    <CodeBlock className="shiki">
      <code>
        <span>find dataset/</span>
        <span> -name '._*'</span>
      </code>
    </CodeBlock>,
  )

afterEach(() => {
  vi.useRealTimers()
  setClipboard(undefined)
})

describe('CodeBlock', () => {
  it('renders the code in a pre', () => {
    renderBlock()
    expect(screen.getByText('find dataset/').closest('pre')).toHaveClass(
      'shiki',
    )
  })

  it('copies the exact code and announces it', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })
    renderBlock()

    await user.click(screen.getByRole('button', { name: 'Copy code' }))

    expect(writeText).toHaveBeenCalledWith("find dataset/ -name '._*'")
    expect(screen.getByRole('status')).toHaveTextContent('Copied')
  })

  it('goes back to the copy icon after two seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) })
    renderBlock()

    await user.click(screen.getByRole('button', { name: 'Copy code' }))
    expect(screen.getByRole('status')).toHaveTextContent('Copied')

    await act(() => vi.advanceTimersByTimeAsync(2000))

    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('does not claim to have copied when the clipboard refuses', async () => {
    const user = userEvent.setup()
    setClipboard({
      writeText: vi
        .fn()
        .mockRejectedValue(new DOMException('', 'NotAllowedError')),
    })
    renderBlock()

    await user.click(screen.getByRole('button', { name: 'Copy code' }))

    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('shows no button without a clipboard', () => {
    setClipboard(undefined)
    renderBlock()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

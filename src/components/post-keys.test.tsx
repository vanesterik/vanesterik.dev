import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PostKeys } from './post-keys'

const push = vi.fn()
const prefetch = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, prefetch }) }))

describe('PostKeys', () => {
  beforeEach(() => {
    push.mockClear()
    prefetch.mockClear()
  })

  it('renders nothing', () => {
    const { container } = render(<PostKeys previous="older" next="newer" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('goes to the older post on J and the newer on K', async () => {
    const user = userEvent.setup()
    render(<PostKeys previous="older" next="newer" />)
    await user.keyboard('j')
    expect(push).toHaveBeenLastCalledWith('/posts/older/')
    await user.keyboard('k')
    expect(push).toHaveBeenLastCalledWith('/posts/newer/')
  })

  it('works with Shift or Caps Lock', async () => {
    const user = userEvent.setup()
    render(<PostKeys previous="older" next="newer" />)
    await user.keyboard('{Shift>}J{/Shift}')
    expect(push).toHaveBeenLastCalledWith('/posts/older/')
    await user.keyboard('K')
    expect(push).toHaveBeenLastCalledWith('/posts/newer/')
  })

  it('does nothing at the ends', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<PostKeys next="newer" />)
    await user.keyboard('j')
    expect(push).not.toHaveBeenCalled()
    rerender(<PostKeys previous="older" />)
    await user.keyboard('k')
    expect(push).not.toHaveBeenCalled()
  })

  it('leaves other keys alone', async () => {
    const user = userEvent.setup()
    render(<PostKeys previous="older" next="newer" />)
    await user.keyboard('x{Escape}')
    expect(push).not.toHaveBeenCalled()
  })

  it.each([['Meta'], ['Control'], ['Alt']])(
    'ignores J with %s held',
    async (mod) => {
      const user = userEvent.setup()
      render(<PostKeys previous="older" next="newer" />)
      await user.keyboard(`{${mod}>}j{/${mod}}`)
      expect(push).not.toHaveBeenCalled()
    },
  )

  it('ignores keys typed in a text field', async () => {
    const user = userEvent.setup()
    render(
      <>
        <PostKeys previous="older" next="newer" />
        <input aria-label="field" />
      </>,
    )
    await user.type(document.querySelector('input') as HTMLElement, 'jk')
    expect(push).not.toHaveBeenCalled()
  })

  it('prevents the default only when it navigates', () => {
    render(<PostKeys previous="older" />)
    const j = new KeyboardEvent('keydown', { key: 'j', cancelable: true })
    const k = new KeyboardEvent('keydown', { key: 'k', cancelable: true })
    window.dispatchEvent(j)
    window.dispatchEvent(k)
    expect(j.defaultPrevented).toBe(true)
    expect(k.defaultPrevented).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'

import { shortcutKey } from './shortcut-key'

const press = (init: KeyboardEventInit, target?: HTMLElement) => {
  const event = new KeyboardEvent('keydown', { bubbles: true, ...init })
  if (!target) return shortcutKey(event)
  document.body.append(target)
  let result: string | undefined
  target.addEventListener('keydown', (e) => {
    result = shortcutKey(e)
  })
  target.dispatchEvent(event)
  target.remove()
  return result
}

describe('shortcutKey', () => {
  it('returns the key in lower case', () => {
    expect(press({ key: 'J' })).toBe('j')
    expect(press({ key: 'k' })).toBe('k')
    expect(press({ key: 'Escape' })).toBe('escape')
  })

  it.each([['metaKey'], ['ctrlKey'], ['altKey']])(
    'returns nothing with %s held',
    (modifier) => {
      expect(press({ key: 'j', [modifier]: true })).toBeUndefined()
    },
  )

  it.each([['input'], ['textarea'], ['select']])(
    'returns nothing in a %s',
    (tag) => {
      expect(press({ key: 'j' }, document.createElement(tag))).toBeUndefined()
    },
  )

  it('returns nothing in a content-editable element', () => {
    const div = document.createElement('div')
    div.contentEditable = 'true'
    // jsdom does not implement isContentEditable
    Object.defineProperty(div, 'isContentEditable', { value: true })
    expect(press({ key: 'j' }, div)).toBeUndefined()
  })

  it('returns the key from another element', () => {
    expect(press({ key: 'j' }, document.createElement('div'))).toBe('j')
  })
})

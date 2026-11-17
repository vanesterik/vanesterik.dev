// The key of a keyboard shortcut in lower case, so Shift and Caps Lock don't
// matter; nothing when the press must be left alone: a shortcut with Cmd, Ctrl
// or Alt stays the browser's, and a text field keeps its keys
export const shortcutKey = (event: KeyboardEvent): string | undefined => {
  if (event.metaKey || event.ctrlKey || event.altKey) return undefined
  const { target } = event
  if (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.closest('input, textarea, select'))
  ) {
    return undefined
  }
  return event.key.toLowerCase()
}

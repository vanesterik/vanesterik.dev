'use client'

import { Check, Copy } from 'lucide-react'
import {
  type ComponentProps,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

import { Button } from '@/components/ui/button'

const subscribe = () => () => {}

// The Clipboard API only exists in secure contexts (HTTPS or localhost)
const hasClipboard = () => Boolean(navigator.clipboard?.writeText)

// Shiki's <pre> with a copy button that appears on hover or keyboard focus,
// and always on devices that can't hover
export const CodeBlock = (props: ComponentProps<'pre'>) => {
  const pre = useRef<HTMLPreElement>(null)
  const [isCopied, setIsCopied] = useState(false)
  const canCopy = useSyncExternalStore(subscribe, hasClipboard, () => false)

  useEffect(() => {
    if (!isCopied) return
    const timeout = setTimeout(() => setIsCopied(false), 2000)
    return () => clearTimeout(timeout)
  }, [isCopied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pre.current?.textContent ?? '')
      setIsCopied(true)
    } catch {
      // The browser refused (for example, clipboard permission denied); don't
      // claim the code was copied
    }
  }

  return (
    <div className="group relative">
      <pre ref={pre} {...props} />
      {canCopy && (
        <Button
          type="button"
          variant="ghost"
          aria-label="Copy code"
          onClick={copy}
          className="absolute top-2 right-2 bg-background/80 opacity-0 transition-opacity hover:bg-background focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
        >
          {isCopied ? <Check /> : <Copy />}
        </Button>
      )}
      <span role="status" className="sr-only">
        {isCopied ? 'Copied' : ''}
      </span>
    </div>
  )
}

import { cn } from 'cn'

import { TerminalRecording } from '@/components/terminal-recording'
import { withBasePath } from '@/lib/base-path'
import type { TerminalLine, Tone } from '@/lib/projects'

const TONE_COLORS: Record<Tone, string> = {
  command: 'text-foreground',
  info: 'text-muted-foreground',
  warn: 'text-warning',
  success: 'text-success',
}

// A scripted session as lines, a recording of one, or a screenshot of a
// terminal app
type TerminalFrameProps = { name: string } & (
  | { lines: TerminalLine[] }
  | { recording: string }
  | { image: string; alt: string }
)

/**
 * A terminal window showing what a tool does: a scripted session or a looping
 * recording under a "zsh — <name>" title, or a screenshot of a terminal app
 * on its own, in the
 * browser frame's border. A session has the dark class, which gives
 * everything inside the dark theme's tokens, so it stays dark and its colors
 * stay readable in the light theme too
 */
export const TerminalFrame = (props: TerminalFrameProps) => (
  <figure
    className={cn(
      'flex flex-col rounded-md',
      // A screenshot already shows a terminal, so it runs to the edges
      // without a title, in the browser frame's border; a session gets a
      // terminal's margin and title, in the dark theme's colors
      'image' in props
        ? 'overflow-hidden border border-accent'
        : 'dark min-h-55 gap-3 bg-secondary p-4 font-mono text-[13px] text-foreground leading-relaxed',
    )}
  >
    {!('image' in props) && (
      <figcaption className="flex justify-between text-muted-foreground">
        <span>zsh — {props.name}</span>
        {'recording' in props && <span>loop</span>}
      </figcaption>
    )}
    {'recording' in props ? (
      <TerminalRecording recording={props.recording} />
    ) : 'image' in props ? (
      // biome-ignore lint/performance/noImgElement: the static export has no image optimizer, so next/image adds nothing
      <img
        src={withBasePath(props.image)}
        alt={props.alt}
        loading="lazy"
        className="aspect-[16/10] w-full object-cover"
      />
    ) : (
      // A path without spaces breaks mid-word rather than past a phone's edge
      <pre className="wrap-break-word whitespace-pre-wrap font-mono">
        {props.lines.map(({ text, tone }, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: the lines are static and never reorder
          <span key={index} className={cn('block', TONE_COLORS[tone])}>
            {tone === 'command' ? `$ ${text}` : text}
          </span>
        ))}
        <span className="block">
          ${' '}
          <span
            aria-hidden="true"
            className="inline-block h-[1.1em] w-[0.6em] translate-y-[0.15em] bg-foreground"
          />
        </span>
      </pre>
    )}
  </figure>
)

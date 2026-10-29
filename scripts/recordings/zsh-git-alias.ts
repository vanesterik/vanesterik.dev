import type { TerminalFlow } from './record.ts'

/**
 * zsh-git-alias: installed with zap, its aliases listed (far more than fit,
 * which is the point), then three of them in the plugin's own repository: its
 * status, its remotes, and its log in less. Needs that repository at
 * ~/Projects/zsh-git-alias, and the network for zap's clones
 */
export default {
  kind: 'terminal',
  plugin: 'vanesterik/zsh-git-alias',
  steps: [
    { type: 'plug "vanesterik/zsh-git-alias"' },
    { type: 'alias' },
    { type: 'cd ~/Projects/zsh-git-alias' },
    { type: 'gst' },
    { type: 'grv' },
    // less's prompt: a colon and a clear to the end of the line, not a
    // colon in a commit message
    {
      type: 'glol',
      waitFor: ':\\x1b\\[K|\\(END\\)',
      pause: 3000,
      press: 'q',
    },
  ],
} satisfies TerminalFlow

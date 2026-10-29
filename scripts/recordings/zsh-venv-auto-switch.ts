import type { TerminalFlow } from './record.ts'

/**
 * zsh-venv-auto-switch: installed with zap, then into a project with a .venv,
 * where python is the project's, and back home, where there's none. Needs
 * ~/Projects/fartt with a .venv, and the network for zap's clones
 */
export default {
  kind: 'terminal',
  plugin: 'vanesterik/zsh-venv-auto-switch',
  steps: [
    { type: 'plug "vanesterik/zsh-venv-auto-switch"' },
    { type: 'cd ~/Projects/fartt' },
    { type: 'which python' },
    { type: 'cd ~' },
    { type: 'which python' },
  ],
} satisfies TerminalFlow

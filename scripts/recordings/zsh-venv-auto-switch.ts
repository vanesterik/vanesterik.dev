import type { TerminalFlow } from './record.ts'

/**
 * zsh-venv-auto-switch: installed with zap, then a new uv project on Python
 * 3.14, synced so it has a .venv, where python is the project's, and back
 * home, where there's none. print -D shows the home folder as ~. Starts in
 * the home folder and creates ~/my-python-project, which mustn't exist yet
 * and is removed afterwards. Needs uv, Python 3.14, and the network for
 * zap's clones
 */
export default {
  kind: 'terminal',
  plugin: 'vanesterik/zsh-venv-auto-switch',
  cwd: '~',
  creates: ['~/my-python-project'],
  steps: [
    { type: 'plug "vanesterik/zsh-venv-auto-switch"' },
    { type: 'uv init my-python-project --python 3.14' },
    { type: 'uv sync --project my-python-project' },
    { type: 'cd my-python-project' },
    { type: 'print -D $(which python)' },
    { type: 'cd ~' },
    { type: 'print -D $(which python)' },
  ],
} satisfies TerminalFlow

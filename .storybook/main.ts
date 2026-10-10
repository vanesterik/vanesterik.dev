import type { StorybookConfig } from '@storybook/nextjs-vite'

const config: StorybookConfig = {
  stories: [
    '../src/stories/**/*.stories.tsx',
    '../src/components/**/*.stories.tsx',
  ],
  addons: ['@storybook/addon-themes'],
  framework: '@storybook/nextjs-vite',
  staticDirs: ['../public'],
  core: {
    disableTelemetry: true,
  },
}

export default config

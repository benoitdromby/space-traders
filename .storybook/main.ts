import type { StorybookConfig } from '@storybook/vue3-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-docs', 'msw-storybook-addon'],
  framework: '@storybook/vue3-vite',
  // Serves public/mockServiceWorker.js (msw-storybook-addon) as well as the app's own static
  // assets (favicon, ...) — same directory the real app's `vite.config.ts` already serves.
  staticDirs: ['../public'],
}
export default config

import globals from 'globals'
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import prettierConfig from 'eslint-config-prettier/flat'

export default defineConfigWithVueTs(
  { name: 'app/ignores', ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**'] },
  { name: 'app/files', files: ['**/*.{ts,mts,tsx,vue,js,mjs}'] },
  { languageOptions: { globals: { ...globals.browser } } },
  js.configs.recommended,
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  {
    name: 'app/vue-rules',
    files: ['**/*.vue'],
    rules: {
      'vue/multi-word-component-names': ['error', { ignores: ['App'] }],
    },
  },
  // Must stay last: turns off stylistic rules that conflict with Prettier.
  prettierConfig,
)

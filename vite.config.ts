import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import vueI18n from '@intlify/unplugin-vue-i18n/vite'

const DEFAULT_API_BASE_URL = 'https://api.spacetraders.io/v2'

/**
 * Adds a Content-Security-Policy to the production build so that, even if a
 * script were ever injected, the bearer token could only be sent to the API
 * origin. Applied at build time only: the dev server needs inline scripts and
 * websockets for HMR.
 */
function contentSecurityPolicy(apiOrigin: string): Plugin {
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    `connect-src 'self' ${apiOrigin}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  return {
    name: 'space-traders:csp',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: policy },
          injectTo: 'head-prepend',
        },
      ]
    },
  }
}

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiOrigin = new URL(env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).origin

  return {
    base: env.VITE_BASE_PATH || '/',
    // The demo token is for local development only: never let a build embed it,
    // even if it is set in .env.local.
    define: command === 'build' ? { 'import.meta.env.VITE_DEMO_TOKEN': 'undefined' } : {},
    plugins: [
      vue(),
      tailwindcss(),
      vueI18n({
        include: [fileURLToPath(new URL('./src/i18n/locales/**', import.meta.url))],
        strictMessage: false,
      }),
      contentSecurityPolicy(apiOrigin),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})

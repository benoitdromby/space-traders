import '@fontsource/space-mono/400.css'
import '@fontsource/space-mono/700.css'
import '@fontsource-variable/dm-sans'
import '@/assets/main.css'

import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { mswLoader } from 'msw-storybook-addon/csf3'
import { setup, type Preview } from '@storybook/vue3-vite'

import { i18n } from '@/i18n'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { useFleetStore } from '@/features/fleet/stores/fleetStore'
import { defaultHandlers } from '@/mocks/handlers'

// Just enough router for useRouter()/RouterLink to work in any story — this app's actual
// routes/guards (and their redirect/fallback logic) have their own test suite; this only
// reproduces the one piece of guard behaviour a story can actually observe: clicking a ship
// (which just navigates, the same as the real FleetList) needs *something* to turn that into
// `fleet.selectedShip` actually changing, the way the real guard's `selectBySymbol` call does.
//
// Built fresh inside `setup()` below, not once at module scope: a single shared router (and so
// a single shared memory-history location) turned out to outlive the story that navigated it —
// confirmed the hard way, a ship selected via a click in one story got re-selected by this same
// guard several stories later, aborting that later story's own unrelated fleet fetch (the guard
// resolves `useFleetStore()` at the moment it finally runs, which is whatever Pinia happens to
// be active *then* — not necessarily the story that triggered the navigation).
function createStoryRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'splash', component: { template: '<div />' } },
      { path: '/ship/:symbol', name: 'ship', component: { template: '<div />' } },
      { path: '/error/:reason', name: 'error', component: { template: '<div />' } },
    ],
  })

  router.beforeEach(async (to) => {
    if (to.name === 'ship') {
      // Resolved here, not at module scope: the active Pinia is whichever one this story's own
      // `setup()` installed, which doesn't exist yet when this file first runs.
      const fleet = useFleetStore()
      const symbol = String(to.params.symbol)
      if (fleet.selectedShip?.symbol !== symbol) await fleet.selectBySymbol(symbol)
    }
    return true
  })

  return router
}

setup((app) => {
  app.use(createPinia())
  app.use(i18n)
  app.use(createStoryRouter())
})

// Resets store state before every story renders. This can't live in `beforeEach` below: that
// runs before the story's app/Pinia even exists (calling `useFleetStore()` there throws "no
// active Pinia"), so it has to be a decorator instead — decorators mount as part of the same app
// as the story itself, giving these composables somewhere real to resolve against. Needed at
// all because a ship selected in one story otherwise stayed selected in a later one showing a
// completely different fleet — Storybook's Vue3 renderer doesn't guarantee a fresh Pinia
// instance per story the way `setActivePinia(createPinia())` does between Vitest tests.
function resetStores() {
  const fleet = useFleetStore()
  fleet.ships = []
  fleet.total = 0
  fleet.page = 1
  fleet.status = 'idle'
  fleet.loaded = false
  fleet.selectedShip = null

  useAuthStore().disconnect()
}

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'space',
      values: [{ name: 'space', value: '#080c14' }],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // The "happy path" for the whole app — most stories work unmodified; ones demonstrating an
    // error or an edge case override just the handler(s) they need via `parameters.msw`.
    msw: defaultHandlers(),
  },
  loaders: [mswLoader()],
  // `i18n` is a plain module singleton shared across every story — confirmed the hard way: the
  // language-switcher story left the whole app showing French for whatever story ran after it.
  beforeEach() {
    i18n.global.locale.value = 'en'
  },
  decorators: [
    (story) => ({
      components: { story },
      setup: resetStores,
      template: '<story />',
    }),
  ],
}

export default preview

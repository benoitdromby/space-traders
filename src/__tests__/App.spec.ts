import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { flushPromises, mount } from '@vue/test-utils'

import { AGENT } from '@/__tests__/helpers'
import { i18n } from '@/i18n'
import { useAuthStore } from '@/features/auth/stores/authStore'

import App from '@/App.vue'

/** A minimal router with one page that requires auth and one that doesn't. */
function testRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'splash', component: { template: '<div>Splash</div>' } },
      {
        path: '/ship/:symbol',
        name: 'ship',
        component: { template: '<div>Dashboard</div>' },
        meta: { requiresAuth: true },
      },
    ],
  })
}

describe('App', () => {
  // Regression test for a real bug: DashboardView/ErrorView used to call router.replace()
  // themselves *and* this watcher fired too — two concurrent navigations to the same target,
  // with Vue Router silently cancelling whichever lost. Sometimes neither actually completed,
  // leaving the page showing empty/loading state instead of the splash page. This is now the
  // *only* place that navigates on disconnect, so there is nothing left to race.
  it('navigates to splash once the session ends while on a page that requires auth', async () => {
    setActivePinia(createPinia())
    const auth = useAuthStore()
    auth.agent = AGENT
    const router = testRouter()
    await router.push('/ship/LEO-1')
    mount(App, { global: { plugins: [router, i18n] } })

    auth.disconnect()
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('splash')
  })

  it('does nothing if the session ends while already on a page that does not require auth', async () => {
    setActivePinia(createPinia())
    const auth = useAuthStore()
    auth.agent = AGENT
    const router = testRouter()
    await router.push('/')
    mount(App, { global: { plugins: [router, i18n] } })

    auth.disconnect()
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('splash') // already there, nothing to do
  })

  it('does not navigate while the session stays connected', async () => {
    setActivePinia(createPinia())
    const auth = useAuthStore()
    auth.agent = AGENT
    const router = testRouter()
    await router.push('/ship/LEO-1')
    mount(App, { global: { plugins: [router, i18n] } })

    await flushPromises()

    expect(router.currentRoute.value.name).toBe('ship')
  })

  // Regression coverage: this full-screen state used to also cover the splash page's own
  // "connecting" moment, which (since navigation hadn't happened yet) handed back to the router
  // for an instant mid-connect and flashed the splash page again before the dashboard took over.
  it('shows the loading screen only until the router settles its first navigation', async () => {
    setActivePinia(createPinia())
    const router = testRouter()
    // Deliberately not awaited/pushed to beforehand, unlike every other test here: this is
    // exactly the gap the loading screen exists to cover, before the router has resolved
    // *anything* yet (its own implicit initial navigation to the starting location).
    const wrapper = mount(App, { global: { plugins: [router, i18n] } })

    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Splash')

    await router.isReady()
    await flushPromises()

    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Splash')
  })

  it('does not bring the loading screen back for a later reconnect once the app has loaded', async () => {
    setActivePinia(createPinia())
    const auth = useAuthStore()
    const router = testRouter()
    await router.push('/')
    const wrapper = mount(App, { global: { plugins: [router, i18n] } })
    await flushPromises()

    auth.connecting = true // e.g. resubmitting a token from the splash page
    await flushPromises()

    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Splash')
  })
})

import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { flushPromises, mount } from '@vue/test-utils'

import { AGENT } from '@/__tests__/helpers'
import { i18n } from '@/i18n'
import { useAuthStore } from '@/features/auth/stores/authStore'

import ErrorView from '@/views/ErrorView.vue'

function testRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'splash', component: { template: '<div />' } },
      { path: '/error/:reason', name: 'error', component: ErrorView, props: true },
    ],
  })
}

async function mountAt(reason: string) {
  setActivePinia(createPinia())
  i18n.global.locale.value = 'en'
  const router = testRouter()
  await router.push(`/error/${reason}`)
  const wrapper = mount(ErrorView, { props: { reason }, global: { plugins: [router, i18n] } })
  return { wrapper, router }
}

describe('ErrorView', () => {
  it('shows the message for a known reason', async () => {
    const { wrapper } = await mountAt('no-ships')
    expect(wrapper.text()).toContain('This agent has no ships')
  })

  it('shows its own heading for the "not found" reason, not the generic one', async () => {
    const { wrapper } = await mountAt('not-found')
    expect(wrapper.text()).toContain('Lost in space')
    expect(wrapper.text()).toContain('This page does not exist.')
  })

  it('falls back to a generic message for an unrecognised reason', async () => {
    const { wrapper } = await mountAt('something-nobody-registered')
    expect(wrapper.text()).toContain('Something went wrong and this page cannot be shown.')
  })

  it('offers a way back home for "not found", but not for "no ships" (it would just bounce back)', async () => {
    const notFound = await mountAt('not-found')
    expect(notFound.wrapper.find('a[href="/"]').exists()).toBe(true)

    const noShips = await mountAt('no-ships')
    expect(noShips.wrapper.find('a[href="/"]').exists()).toBe(false)
  })

  it('hides the disconnect button for an anonymous visitor', async () => {
    const { wrapper } = await mountAt('not-found')
    expect(wrapper.text()).not.toContain('Disconnect')
  })

  it('shows the agent and a disconnect button when connected, and disconnects to the splash page', async () => {
    setActivePinia(createPinia())
    useAuthStore().agent = AGENT
    i18n.global.locale.value = 'en'
    const router = testRouter()
    await router.push('/error/no-ships')
    const wrapper = mount(ErrorView, {
      props: { reason: 'no-ships' },
      global: { plugins: [router, i18n] },
    })

    expect(wrapper.text()).toContain(AGENT.symbol)
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('splash')
  })
})

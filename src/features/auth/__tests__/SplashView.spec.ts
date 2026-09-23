import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import { mount } from '@vue/test-utils'

import { i18n } from '@/i18n'
import { createAppRouter } from '@/router'
import { makeFleet, mockAgentAndShipsApi } from '@/features/fleet/__tests__/fixtures'

import SplashView from '@/features/auth/views/SplashView.vue'

async function mountSplash() {
  setActivePinia(createPinia())
  i18n.global.locale.value = 'en'
  const router = createAppRouter(createMemoryHistory())
  await router.push('/')
  const wrapper = mount(SplashView, { global: { plugins: [router, i18n] } })
  return { wrapper, router }
}

async function submitToken(wrapper: Awaited<ReturnType<typeof mountSplash>>['wrapper']) {
  await wrapper.find('input').setValue('a-token')
  await wrapper.find('form').trigger('submit')
}

describe('SplashView', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('connecting lands on the first ship', async () => {
    mockAgentAndShipsApi(makeFleet(2))
    const { wrapper, router } = await mountSplash()

    await submitToken(wrapper)
    // The target route's component (and everything it pulls in) is loaded lazily; give that
    // real time to settle rather than guessing how many ticks it needs.
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('ship'))

    expect(router.currentRoute.value.params.symbol).toBe('LEO-1')
  })

  it('connecting to an agent with no ships lands on the "no ships" page, not a dead end', async () => {
    mockAgentAndShipsApi(makeFleet(0))
    const { wrapper, router } = await mountSplash()

    await submitToken(wrapper)
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('error'))

    expect(router.currentRoute.value.params.reason).toBe('no-ships')
  })

  // Regression test: the button used to flip back to its idle label as soon as the agent fetch
  // resolved, even though the fleet still had to load and the page still had to navigate away —
  // which is what let App.vue's separate full-screen loading state hand back to the router (and
  // so this page) for an instant before the dashboard took over. This page's own pending state
  // now stays up for that whole flow, not just the agent fetch.
  it('stays in a pending state until navigation actually lands, not just once the agent responds', async () => {
    mockAgentAndShipsApi(makeFleet(2))
    const { wrapper, router } = await mountSplash()

    await submitToken(wrapper)
    expect(wrapper.find('button[type="submit"]').text()).toContain('Connecting')

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('ship'))
  })
})

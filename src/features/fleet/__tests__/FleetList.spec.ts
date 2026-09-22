import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { flushPromises, mount } from '@vue/test-utils'

import { mockFetch } from '@/__tests__/helpers'
import { i18n } from '@/i18n'
import { createAppRouter } from '@/router'
import { saveAuthToken } from '@/api/authToken'
import { useFleetStore } from '@/features/fleet/stores/fleetStore'

import FleetList from '@/features/fleet/components/FleetList.vue'
import { makeFleet, mockAgentAndShipsApi, mockShipsApi } from '@/features/fleet/__tests__/fixtures'

/** A router with nowhere to actually go: enough for useRouter() to work, without the guard's auth/fleet concerns. */
function bareRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/ship/:symbol', name: 'ship', component: { template: '<div />' } }],
  })
}

/** Loads the fleet directly (bypassing routing, which isn't what these tests are about), then mounts. */
async function mountFleet() {
  const pinia = createPinia()
  setActivePinia(pinia)
  i18n.global.locale.value = 'en'
  await useFleetStore().load()
  const wrapper = mount(FleetList, { global: { plugins: [pinia, i18n, bareRouter()] } })
  await flushPromises()
  return wrapper
}

describe('FleetList', () => {
  beforeEach(() => sessionStorage.clear())
  afterEach(() => vi.unstubAllGlobals())

  it('shows skeletons while loading', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
    const pinia = createPinia()
    setActivePinia(pinia)
    void useFleetStore().load() // fires the request; never resolves in this test
    const wrapper = mount(FleetList, { global: { plugins: [pinia, i18n, bareRouter()] } })
    expect(wrapper.findAll('li[aria-hidden="true"]')).toHaveLength(3)
    expect(wrapper.text()).not.toContain('empty')
  })

  it('lists the ships and the total', async () => {
    mockShipsApi(makeFleet(2))
    const wrapper = await mountFleet()

    expect(wrapper.findAll('li button')).toHaveLength(2)
    expect(wrapper.text().replace(/\s+/g, ' ')).toContain('Fleet · 2 ships')
  })

  it('hides the pagination for 3 ships or fewer', async () => {
    mockShipsApi(makeFleet(3))
    const wrapper = await mountFleet()

    expect(wrapper.findAll('li button')).toHaveLength(3)
    expect(wrapper.find('nav').exists()).toBe(false)
  })

  it('shows the pagination from 4 ships and moves between pages', async () => {
    mockShipsApi(makeFleet(7))
    const wrapper = await mountFleet()

    expect(wrapper.find('nav').exists()).toBe(true)
    expect(wrapper.text()).toContain('page 1 / 3')

    await wrapper.find('button[aria-label="Next page"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('page 2 / 3')
    expect(wrapper.text()).toContain('LEO-4')
    expect(wrapper.text()).not.toContain('LEO-1')
  })

  it('tells the user when the fleet is empty', async () => {
    mockShipsApi([])
    const wrapper = await mountFleet()
    expect(wrapper.text()).toContain('Your fleet is empty.')
  })

  it('shows an error with a retry button', async () => {
    mockFetch(500, {})
    const pinia = createPinia()
    setActivePinia(pinia)
    await useFleetStore().load()
    i18n.global.locale.value = 'en'
    const wrapper = mount(FleetList, { global: { plugins: [pinia, i18n, bareRouter()] } })
    await flushPromises()
    expect(wrapper.find('[role="alert"]').text()).toContain('Could not load your fleet.')

    const fetchMock = mockShipsApi(makeFleet(2))
    await wrapper.find('[role="alert"] button').trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(wrapper.findAll('li button')).toHaveLength(2)
  })

  it('clicking a ship navigates to its URL and, through the real guard, highlights it', async () => {
    saveAuthToken('stored')
    const pinia = createPinia()
    setActivePinia(pinia)
    mockAgentAndShipsApi(makeFleet(3))
    const router = createAppRouter(createMemoryHistory())
    await router.push('/ship/LEO-1')
    i18n.global.locale.value = 'en'

    const wrapper = mount(FleetList, { global: { plugins: [pinia, i18n, router] } })
    await flushPromises()
    const pressed = () => wrapper.findAll('button[aria-pressed="true"]').map((b) => b.text())
    expect(pressed()[0]).toContain('LEO-1')

    await wrapper.findAll('li button')[2]!.trigger('click')
    // The target is the route already showing, so this is normally instant, but it's still a
    // lazily-resolved navigation: wait for the outcome rather than guessing how many ticks it needs.
    await vi.waitFor(() => expect(router.currentRoute.value.params.symbol).toBe('LEO-3'))
    await flushPromises()

    expect(pressed()).toHaveLength(1)
    expect(pressed()[0]).toContain('LEO-3')
  })
})

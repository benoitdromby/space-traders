import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'

import { mockFetch } from '@/__tests__/helpers'
import { i18n } from '@/i18n'

import FleetList from '@/features/fleet/components/FleetList.vue'
import { makeFleet, mockShipsApi, requestedPages } from '@/features/fleet/__tests__/fixtures'

async function mountFleet() {
  const pinia = createPinia()
  setActivePinia(pinia)
  i18n.global.locale.value = 'en'
  const wrapper = mount(FleetList, { global: { plugins: [pinia, i18n] } })
  await flushPromises()
  return wrapper
}

describe('FleetList', () => {
  beforeEach(() => sessionStorage.clear())
  afterEach(() => vi.unstubAllGlobals())

  it('shows skeletons while loading', async () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
    const pinia = createPinia()
    const wrapper = mount(FleetList, { global: { plugins: [pinia, i18n] } })
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
    const fetchMock = mockShipsApi(makeFleet(7))
    const wrapper = await mountFleet()

    expect(wrapper.find('nav').exists()).toBe(true)
    expect(wrapper.text()).toContain('page 1 / 3')

    await wrapper.find('button[aria-label="Next page"]').trigger('click')
    await flushPromises()

    expect(requestedPages(fetchMock)).toEqual([1, 2])
    expect(wrapper.text()).toContain('page 2 / 3')
    expect(wrapper.text()).toContain('LEO-4')
    expect(wrapper.text()).not.toContain('LEO-1')
  })

  it('highlights the first ship, then the one that is clicked', async () => {
    mockShipsApi(makeFleet(3))
    const wrapper = await mountFleet()
    const pressed = () => wrapper.findAll('button[aria-pressed="true"]').map((b) => b.text())

    expect(pressed()[0]).toContain('LEO-1')
    await wrapper.findAll('li button')[2]!.trigger('click')
    expect(pressed()).toHaveLength(1)
    expect(pressed()[0]).toContain('LEO-3')
  })

  it('tells the user when the fleet is empty', async () => {
    mockShipsApi([])
    const wrapper = await mountFleet()
    expect(wrapper.text()).toContain('Your fleet is empty.')
  })

  it('shows an error with a retry button', async () => {
    mockFetch(500, {})
    const wrapper = await mountFleet()
    expect(wrapper.find('[role="alert"]').text()).toContain('Could not load your fleet.')

    const fetchMock = mockShipsApi(makeFleet(2))
    await wrapper.find('[role="alert"] button').trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(wrapper.findAll('li button')).toHaveLength(2)
  })
})

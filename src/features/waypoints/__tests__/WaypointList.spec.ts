import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import { mockFetch } from '@/__tests__/helpers'
import VirtualList from '@/components/VirtualList.vue'
import { makeShip } from '@/features/fleet/__tests__/fixtures'
import { i18n } from '@/i18n'

import WaypointList from '@/features/waypoints/components/WaypointList.vue'
import {
  makeWaypoint,
  makeWaypoints,
  mockWaypointsApi,
  requestedWaypointPages,
} from '@/features/waypoints/__tests__/fixtures'
import { WAYPOINTS_PAGE_LIMIT } from '@/features/waypoints/api/waypointsApi'

/** jsdom never reports a real `clientHeight`: fake one and re-trigger VirtualList's own measure. */
function measureVirtualList(wrapper: ReturnType<typeof mount>, height = 320) {
  const container = wrapper.get('[role="list"]').element as HTMLElement
  Object.defineProperty(container, 'clientHeight', { configurable: true, value: height })
  const virtualList = wrapper.findComponent(VirtualList)
  ;(virtualList.vm as unknown as { measure: () => void }).measure()
}

async function mountList(props: {
  ship: ReturnType<typeof makeShip> | null
  fleetLoaded: boolean
}) {
  i18n.global.locale.value = 'en'
  const wrapper = mount(WaypointList, { props, global: { plugins: [i18n] } })
  await flushPromises()
  if (wrapper.find('[role="list"]').exists()) {
    measureVirtualList(wrapper)
    await wrapper.vm.$nextTick()
  }
  return wrapper
}

describe('WaypointList', () => {
  it('shows a skeleton before the fleet has loaded', () => {
    mockFetch(200, {})
    i18n.global.locale.value = 'en'
    const wrapper = mount(WaypointList, {
      props: { ship: null, fleetLoaded: false },
      global: { plugins: [i18n] },
    })
    expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(true)
  })

  it('tells the user when there is no ship', async () => {
    mockWaypointsApi('X1-XZ48', [])
    const wrapper = await mountList({ ship: null, fleetLoaded: true })
    expect(wrapper.text()).toContain('No ship to show a location for.')
  })

  it('tells the user when the system has no waypoints', async () => {
    mockWaypointsApi('X1-XZ48', [])
    const wrapper = await mountList({ ship: makeShip(1), fleetLoaded: true })
    expect(wrapper.text()).toContain('This system has no waypoints.')
  })

  it('lists the waypoints, marking the current one and any with a marketplace', async () => {
    mockWaypointsApi('X1-XZ48', [
      makeWaypoint(1, { symbol: 'X1-XZ48-A1', hasMarketplace: true }),
      makeWaypoint(2, { symbol: 'X1-XZ48-B2' }),
    ])
    const ship = makeShip(1, { nav: { ...makeShip(1).nav, waypointSymbol: 'X1-XZ48-A1' } })
    const wrapper = await mountList({ ship, fleetLoaded: true })

    const text = wrapper.text()
    expect(text).toContain('X1-XZ48-A1')
    expect(text).toContain('X1-XZ48-B2')
    expect(text).toContain('Here')
    expect(text).toContain('Marketplace')
  })

  it('is windowed: a long list renders far fewer rows than it has items', async () => {
    mockWaypointsApi('X1-XZ48', makeWaypoints(WAYPOINTS_PAGE_LIMIT))
    const wrapper = await mountList({ ship: makeShip(1), fleetLoaded: true })

    const rendered = wrapper.findAll('[role="listitem"]').length
    expect(rendered).toBeGreaterThan(0)
    expect(rendered).toBeLessThan(WAYPOINTS_PAGE_LIMIT)
  })

  it('loads and appends the next page once the user scrolls near the bottom of what is loaded', async () => {
    const stub = mockWaypointsApi('X1-XZ48', makeWaypoints(WAYPOINTS_PAGE_LIMIT + 3))
    const wrapper = await mountList({ ship: makeShip(1), fleetLoaded: true })

    const container = wrapper.get('[role="list"]').element as HTMLElement
    Object.defineProperty(container, 'scrollTop', {
      configurable: true,
      value: WAYPOINTS_PAGE_LIMIT * 50 - 320 - 10, // near the bottom of the currently loaded rows
    })
    await container.dispatchEvent(new Event('scroll'))
    await flushPromises()

    expect(requestedWaypointPages(stub)).toEqual([1, 2])
  })

  it('shows an error with a retry button when the first page fails', async () => {
    mockFetch(500, {})
    const wrapper = await mountList({ ship: makeShip(1), fleetLoaded: true })
    expect(wrapper.find('[role="alert"]').text()).toContain('Could not load waypoints.')

    mockWaypointsApi('X1-XZ48', makeWaypoints(2))
    await wrapper.find('[role="alert"] button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).not.toContain('Could not load waypoints.')
  })

  it('reloads when the selected ship changes', async () => {
    const first = mockWaypointsApi('X1-XZ48', makeWaypoints(2))
    const wrapper = await mountList({ ship: makeShip(1), fleetLoaded: true })
    expect(first).toHaveBeenCalled()

    const second = mockWaypointsApi('X1-YZ99', makeWaypoints(1))
    await wrapper.setProps({
      ship: makeShip(2, {
        nav: { ...makeShip(2).nav, systemSymbol: 'X1-YZ99', waypointSymbol: 'X1-YZ99-A1' },
      }),
    })
    await flushPromises()

    expect(second).toHaveBeenCalled()
  })

  it("reloads when only the selected ship's flight mode changes", async () => {
    const first = mockWaypointsApi('X1-XZ48', makeWaypoints(2))
    const wrapper = await mountList({ ship: makeShip(1), fleetLoaded: true })
    first.mockClear()

    const second = mockWaypointsApi('X1-XZ48', makeWaypoints(2))
    await wrapper.setProps({
      ship: makeShip(1, { nav: { ...makeShip(1).nav, flightMode: 'BURN' } }),
    })
    await flushPromises()

    expect(second).toHaveBeenCalled()
  })
})

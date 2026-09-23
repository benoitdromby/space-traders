import { describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'

import { mockFetch } from '@/__tests__/helpers'
import VirtualList from '@/components/VirtualList.vue'
import { makeShip } from '@/features/fleet/__tests__/fixtures'
import { useFleetStore } from '@/features/fleet/stores/fleetStore'
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
  const pinia = createPinia()
  setActivePinia(pinia)
  // The travel action looks the ship up in the fleet store, not just the prop passed here —
  // seed it the same way DashboardView's real `fleet.selectedShip` would.
  if (props.ship) {
    const fleet = useFleetStore()
    fleet.ships = [props.ship]
    fleet.selectedShip = props.ship
  }
  const wrapper = mount(WaypointList, { props, global: { plugins: [pinia, i18n] } })
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
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(WaypointList, {
      props: { ship: null, fleetLoaded: false },
      global: { plugins: [pinia, i18n] },
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

  describe('travel', () => {
    /** Stubs the waypoints GET already loaded, plus `POST .../navigate` for LEO-1. */
    function mockNavigate(outcome: 'ok' | 'insufficientFuel' | 'serverError') {
      const stub = vi.fn().mockImplementation(async (input: string) => {
        const url = new URL(input)
        if (url.pathname.endsWith('/navigate')) {
          if (outcome === 'ok') {
            return new Response(
              JSON.stringify({
                data: {
                  nav: {
                    systemSymbol: 'X1-XZ48',
                    waypointSymbol: 'X1-XZ48-A2',
                    status: 'IN_TRANSIT',
                    flightMode: 'CRUISE',
                    route: { arrival: '2099-01-01T00:00:00.000Z' },
                  },
                  fuel: { current: 299, capacity: 400 },
                  events: [],
                },
              }),
            )
          }
          if (outcome === 'insufficientFuel') {
            return new Response(
              JSON.stringify({
                error: {
                  code: 4203,
                  message: 'Navigate request failed.',
                  data: { fuelRequired: 500, fuelAvailable: 300 },
                },
              }),
              { status: 400 },
            )
          }
          return new Response(JSON.stringify({ error: { message: 'boom' } }), { status: 500 })
        }
        // The waypoints list itself: already loaded before this stub takes over in each test.
        return new Response(JSON.stringify({ data: [], meta: { total: 0, page: 1, limit: 20 } }))
      })
      vi.stubGlobal('fetch', stub)
      return stub
    }

    it('shows a travel icon for every waypoint except the current one, enabled while in orbit', async () => {
      mockWaypointsApi('X1-XZ48', [
        makeWaypoint(1, { symbol: 'X1-XZ48-A1' }),
        makeWaypoint(2, { symbol: 'X1-XZ48-A2' }),
      ])
      const ship = makeShip(1, {
        nav: { ...makeShip(1).nav, status: 'IN_ORBIT', waypointSymbol: 'X1-XZ48-A1' },
      })
      const wrapper = await mountList({ ship, fleetLoaded: true })

      expect(wrapper.find('[title="Travel to X1-XZ48-A1"]').exists()).toBe(false) // it's already there
      const button = wrapper.get('[title="Travel to X1-XZ48-A2"]')
      expect((button.element as HTMLButtonElement).disabled).toBe(false)
    })

    it('disables the travel icon when the ship is not in orbit', async () => {
      mockWaypointsApi('X1-XZ48', [makeWaypoint(2, { symbol: 'X1-XZ48-A2' })])
      const ship = makeShip(1, { nav: { ...makeShip(1).nav, status: 'DOCKED' } })
      const wrapper = await mountList({ ship, fleetLoaded: true })

      const button = wrapper.get('[title="The ship must be in orbit to travel."]')
      expect((button.element as HTMLButtonElement).disabled).toBe(true)
    })

    it('shows the traveling message once the ship is sent on its way', async () => {
      mockWaypointsApi('X1-XZ48', [makeWaypoint(2, { symbol: 'X1-XZ48-A2' })])
      const ship = makeShip(1, { nav: { ...makeShip(1).nav, status: 'IN_ORBIT' } })
      const wrapper = await mountList({ ship, fleetLoaded: true })

      mockNavigate('ok')
      await wrapper.get('[title="Travel to X1-XZ48-A2"]').trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('In transit to X1-XZ48-A2')
    })

    it('shows the traveling message on mount when the ship was already en route', async () => {
      mockWaypointsApi('X1-XZ48', [makeWaypoint(2, { symbol: 'X1-XZ48-A2' })])
      const ship = makeShip(1, {
        nav: {
          ...makeShip(1).nav,
          status: 'IN_TRANSIT',
          waypointSymbol: 'X1-XZ48-A2',
          route: { arrival: '2099-01-01T00:00:00.000Z' },
        },
      })
      const wrapper = await mountList({ ship, fleetLoaded: true })

      expect(wrapper.text()).toContain('In transit to X1-XZ48-A2')
    })

    it('does not mark the destination "Here" until the ship has actually arrived', async () => {
      // nav.waypointSymbol already points at A2 (the API sets it the instant travel starts),
      // but the ship is still IN_TRANSIT: it hasn't arrived, so A2 must not read as "Here" yet.
      mockWaypointsApi('X1-XZ48', [makeWaypoint(2, { symbol: 'X1-XZ48-A2' })])
      const ship = makeShip(1, {
        nav: { ...makeShip(1).nav, status: 'IN_TRANSIT', waypointSymbol: 'X1-XZ48-A2' },
      })
      const wrapper = await mountList({ ship, fleetLoaded: true })

      expect(wrapper.text()).not.toContain('Here')
      // It's just another (disabled, since the ship isn't in orbit) travel target meanwhile.
      const button = wrapper.get('[title="The ship must be in orbit to travel."]')
      expect((button.element as HTMLButtonElement).disabled).toBe(true)

      await wrapper.setProps({
        ship: makeShip(1, {
          nav: { ...makeShip(1).nav, status: 'IN_ORBIT', waypointSymbol: 'X1-XZ48-A2' },
        }),
      })
      await flushPromises()

      expect(wrapper.text()).toContain('Here')
      expect(wrapper.find('[title="Travel to X1-XZ48-A2"]').exists()).toBe(false)
    })

    it('shows an insufficient-fuel message when the trip is too far', async () => {
      mockWaypointsApi('X1-XZ48', [makeWaypoint(2, { symbol: 'X1-XZ48-A2' })])
      const ship = makeShip(1, { nav: { ...makeShip(1).nav, status: 'IN_ORBIT' } })
      const wrapper = await mountList({ ship, fleetLoaded: true })

      mockNavigate('insufficientFuel')
      await wrapper.get('[title="Travel to X1-XZ48-A2"]').trigger('click')
      await flushPromises()

      const alert = wrapper.get('[role="alert"]')
      expect(alert.text()).toContain('X1-XZ48-A2')
      expect(alert.text()).toContain('500')
      expect(alert.text()).toContain('300')
      expect(wrapper.text()).not.toContain('In transit')
    })

    it('shows a generic error for any other failure', async () => {
      mockWaypointsApi('X1-XZ48', [makeWaypoint(2, { symbol: 'X1-XZ48-A2' })])
      const ship = makeShip(1, { nav: { ...makeShip(1).nav, status: 'IN_ORBIT' } })
      const wrapper = await mountList({ ship, fleetLoaded: true })

      mockNavigate('serverError')
      await wrapper.get('[title="Travel to X1-XZ48-A2"]').trigger('click')
      await flushPromises()

      expect(wrapper.get('[role="alert"]').text()).toContain('Could not start travel.')
    })
  })
})

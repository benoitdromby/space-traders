import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import { mockFetch } from '@/__tests__/helpers'
import { makeShip } from '@/features/fleet/__tests__/fixtures'
import { i18n } from '@/i18n'

import LocationPanel from '@/features/location/components/LocationPanel.vue'

const SYSTEM = { symbol: 'X1-XZ48', type: 'RED_STAR', x: 12, y: -8, waypoints: [1, 2, 3] }
const WAYPOINT = {
  symbol: 'X1-XZ48-A1',
  type: 'PLANET',
  faction: { symbol: 'GALACTIC' },
  traits: [
    { symbol: 'MARKETPLACE', name: 'Marketplace' },
    { symbol: 'BARREN', name: 'Barren' },
  ],
}

function mockLocationApi() {
  return vi.fn().mockImplementation(async (input: string) => {
    const body = input.includes('/waypoints/') ? WAYPOINT : SYSTEM
    return new Response(JSON.stringify({ data: body }))
  })
}

async function mountPanel(props: {
  ship: ReturnType<typeof makeShip> | null
  fleetLoaded: boolean
}) {
  i18n.global.locale.value = 'en'
  const wrapper = mount(LocationPanel, { props, global: { plugins: [i18n] } })
  await flushPromises()
  return wrapper
}

describe('LocationPanel', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('shows a skeleton before the fleet has loaded', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
    i18n.global.locale.value = 'en'
    const wrapper = mount(LocationPanel, {
      props: { ship: null, fleetLoaded: false },
      global: { plugins: [i18n] },
    })
    expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(true)
  })

  it('tells the user when there is no ship', async () => {
    vi.stubGlobal('fetch', mockLocationApi())
    const wrapper = await mountPanel({ ship: null, fleetLoaded: true })
    expect(wrapper.text()).toContain('No ship to show a location for.')
  })

  it('shows the system and waypoint of the selected ship', async () => {
    vi.stubGlobal('fetch', mockLocationApi())
    const wrapper = await mountPanel({ ship: makeShip(1), fleetLoaded: true })
    const text = wrapper.text().replace(/\s+/g, ' ')

    expect(text).toContain('X1-XZ48')
    expect(text).toContain('Red star')
    expect(text).toContain('12, -8')
    expect(text).toContain('3')
    expect(text).toContain('X1-XZ48-A1')
    expect(text).toContain('Planet')
    expect(text).toContain('GALACTIC')
    expect(text).toContain('Marketplace')
  })

  it('shows the marketplace indicator only when the waypoint has one', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (input: string) => {
        const body = input.includes('/waypoints/') ? { ...WAYPOINT, traits: [] } : SYSTEM
        return new Response(JSON.stringify({ data: body }))
      }),
    )
    const wrapper = await mountPanel({ ship: makeShip(1), fleetLoaded: true })
    expect(wrapper.text()).not.toContain('Marketplace')
  })

  it('shows an error with a retry button', async () => {
    mockFetch(500, {})
    const wrapper = await mountPanel({ ship: makeShip(1), fleetLoaded: true })
    expect(wrapper.find('[role="alert"]').text()).toContain('Could not load this location.')

    vi.stubGlobal('fetch', mockLocationApi())
    await wrapper.find('[role="alert"] button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('X1-XZ48-A1')
  })

  it('labels the waypoint "Current waypoint" for a ship that has actually arrived', async () => {
    vi.stubGlobal('fetch', mockLocationApi())
    const wrapper = await mountPanel({ ship: makeShip(1), fleetLoaded: true }) // DOCKED by default
    expect(wrapper.text()).toContain('Current waypoint')
    expect(wrapper.text()).not.toContain('Destination')
    expect(wrapper.text()).not.toContain('In transit')
  })

  it('labels it "Destination" and flags it in transit for a ship still travelling there', async () => {
    vi.stubGlobal('fetch', mockLocationApi())
    const ship = makeShip(1, { nav: { ...makeShip(1).nav, status: 'IN_TRANSIT' } })
    const wrapper = await mountPanel({ ship, fleetLoaded: true })

    expect(wrapper.text()).toContain('Destination')
    expect(wrapper.text()).toContain('In transit')
    expect(wrapper.text()).not.toContain('Current waypoint')
    // Still shows where it's headed, just not as "current".
    expect(wrapper.text()).toContain('X1-XZ48-A1')
  })

  it('refetches when the selected ship changes', async () => {
    const stub = mockLocationApi()
    vi.stubGlobal('fetch', stub)
    const wrapper = await mountPanel({ ship: makeShip(1), fleetLoaded: true })

    await wrapper.setProps({
      ship: makeShip(2, { nav: { ...makeShip(2).nav, waypointSymbol: 'X1-XZ48-B2' } }),
    })
    await flushPromises()

    expect(stub.mock.calls.some(([url]) => String(url).includes('X1-XZ48-B2'))).toBe(true)
  })
})

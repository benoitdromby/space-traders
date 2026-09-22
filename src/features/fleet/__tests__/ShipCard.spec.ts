import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import { i18n } from '@/i18n'

import ShipCard from '@/features/fleet/components/ShipCard.vue'
import { makeShip } from '@/features/fleet/__tests__/fixtures'

function mountCard(
  ship = makeShip(1),
  props: { selected?: boolean; toggling?: boolean; toggleError?: string | null } = {},
) {
  i18n.global.locale.value = 'en'
  return mount(ShipCard, {
    props: { ship, selected: false, toggling: false, toggleError: null, ...props },
    global: { plugins: [i18n] },
  })
}

describe('ShipCard', () => {
  it('shows the ship details', () => {
    const text = mountCard().text()
    expect(text).toContain('LEO-1')
    expect(text).toContain('Frigate')
    expect(text).toContain('Docked')
    expect(text).toContain('CRUISE')
    expect(text).toContain('X1-XZ48-A1')
    expect(text).toContain('25%') // cargo 10 / 40
    expect(text).toContain('75%') // fuel 300 / 400
  })

  it('translates the status', () => {
    const wrapper = mountCard(makeShip(1, { nav: { ...makeShip(1).nav, status: 'IN_TRANSIT' } }))
    expect(wrapper.text()).toContain('In transit')
  })

  it('handles ships without fuel tank or cargo hold', () => {
    const wrapper = mountCard(
      makeShip(1, { fuel: { current: 0, capacity: 0 }, cargo: { units: 0, capacity: 0 } }),
    )
    expect(wrapper.text()).not.toContain('NaN')
    expect(wrapper.text()).toContain('—')
  })

  it('reflects the selection and emits the symbol on click', async () => {
    const wrapper = mountCard(makeShip(4), { selected: true })
    const button = wrapper.find('button')
    expect(button.attributes('aria-pressed')).toBe('true')

    await button.trigger('click')
    expect(wrapper.emitted('select')).toEqual([['LEO-4']])
  })

  describe('the dock/orbit action', () => {
    it('offers to enter orbit when docked, and to dock when in orbit', () => {
      const docked = mountCard(makeShip(1, { nav: { ...makeShip(1).nav, status: 'DOCKED' } }))
      expect(docked.text()).toContain('Enter orbit')

      const orbiting = mountCard(makeShip(1, { nav: { ...makeShip(1).nav, status: 'IN_ORBIT' } }))
      expect(orbiting.text()).toContain('Dock')
    })

    it('is not offered while the ship is in transit', () => {
      const wrapper = mountCard(makeShip(1, { nav: { ...makeShip(1).nav, status: 'IN_TRANSIT' } }))
      expect(wrapper.text()).not.toContain('Enter orbit')
      expect(wrapper.text()).not.toContain('Dock')
    })

    it('emits the symbol, separately from selecting the card', async () => {
      const wrapper = mountCard(makeShip(2))
      await wrapper.findAll('button')[1]!.trigger('click')

      expect(wrapper.emitted('toggle-docking')).toEqual([['LEO-2']])
      expect(wrapper.emitted('select')).toBeUndefined()
    })

    it('disables the button and shows a pending label while in flight', () => {
      const wrapper = mountCard(makeShip(1), { toggling: true })
      const button = wrapper.findAll('button')[1]!
      expect(button.attributes('disabled')).toBeDefined()
      expect(button.text()).toBe('Updating…')
    })

    it('shows the last error', () => {
      const wrapper = mountCard(makeShip(1), { toggleError: 'Could not update this ship.' })
      expect(wrapper.find('[role="alert"]').text()).toBe('Could not update this ship.')
    })
  })
})

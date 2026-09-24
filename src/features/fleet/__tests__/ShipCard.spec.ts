import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import { i18n } from '@/i18n'

import ShipCard from '@/features/fleet/components/ShipCard.vue'
import { makeShip } from '@/features/fleet/__tests__/fixtures'

function mountCard(
  ship = makeShip(1),
  props: {
    selected?: boolean
    toggling?: boolean
    toggleError?: string | null
    changingMode?: boolean
    modeError?: string | null
  } = {},
) {
  i18n.global.locale.value = 'en'
  return mount(ShipCard, {
    props: {
      ship,
      selected: false,
      toggling: false,
      toggleError: null,
      changingMode: false,
      modeError: null,
      ...props,
    },
    global: { plugins: [i18n] },
  })
}

describe('ShipCard', () => {
  it('shows the ship details', () => {
    const wrapper = mountCard()
    const text = wrapper.text()
    expect(text).toContain('LEO-1')
    expect(text).toContain('Frigate')
    expect(text).toContain('Docked')
    expect(text).toContain('X1-XZ48-A1')
    expect(text).toContain('25%') // cargo 10 / 40
    expect(text).toContain('75%') // fuel 300 / 400
    expect((wrapper.find('select').element as HTMLSelectElement).value).toBe('CRUISE')
  })

  it('translates the status', () => {
    const wrapper = mountCard(makeShip(1, { nav: { ...makeShip(1).nav, status: 'IN_TRANSIT' } }))
    expect(wrapper.text()).toContain('In transit')
  })

  it('shows no location while in transit: the ship is between waypoints', () => {
    const wrapper = mountCard(makeShip(1, { nav: { ...makeShip(1).nav, status: 'IN_TRANSIT' } }))
    expect(wrapper.text()).toContain('Location') // the label stays, only the value is empty
    expect(wrapper.text()).not.toContain('X1-XZ48-A1')
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

  describe('the flight mode control', () => {
    it('lists all four modes and shows the current one', () => {
      const wrapper = mountCard(makeShip(1, { nav: { ...makeShip(1).nav, flightMode: 'DRIFT' } }))
      const select = wrapper.find('select')
      expect(select.findAll('option').map((o) => o.element.value)).toEqual([
        'CRUISE',
        'BURN',
        'DRIFT',
        'STEALTH',
      ])
      expect((select.element as HTMLSelectElement).value).toBe('DRIFT')
    })

    it('is offered even while the ship is in transit, unlike dock/orbit', () => {
      const wrapper = mountCard(makeShip(1, { nav: { ...makeShip(1).nav, status: 'IN_TRANSIT' } }))
      expect(wrapper.find('select').exists()).toBe(true)
    })

    it('emits the ship and the newly picked mode', async () => {
      const wrapper = mountCard(makeShip(3))
      await wrapper.find('select').setValue('BURN')

      expect(wrapper.emitted('change-flight-mode')).toEqual([['LEO-3', 'BURN']])
    })

    it('does not emit when the same mode is picked again', async () => {
      const wrapper = mountCard(makeShip(1)) // starts at CRUISE
      await wrapper.find('select').setValue('CRUISE')

      expect(wrapper.emitted('change-flight-mode')).toBeUndefined()
    })

    it('disables the select while a change is in flight', () => {
      const wrapper = mountCard(makeShip(1), { changingMode: true })
      expect(wrapper.find('select').attributes('disabled')).toBeDefined()
    })

    it('shows the last error', () => {
      const wrapper = mountCard(makeShip(1), { modeError: 'Could not update this ship.' })
      expect(wrapper.find('[role="alert"]').text()).toBe('Could not update this ship.')
    })
  })
})

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import { i18n } from '@/i18n'

import ShipCard from '@/features/fleet/components/ShipCard.vue'
import { makeShip } from '@/features/fleet/__tests__/fixtures'

function mountCard(ship = makeShip(1), selected = false) {
  i18n.global.locale.value = 'en'
  return mount(ShipCard, { props: { ship, selected }, global: { plugins: [i18n] } })
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
    const wrapper = mountCard(makeShip(4), true)
    const button = wrapper.find('button')
    expect(button.attributes('aria-pressed')).toBe('true')

    await button.trigger('click')
    expect(wrapper.emitted('select')).toEqual([['LEO-4']])
  })
})

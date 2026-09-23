import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import { mockFetch } from '@/__tests__/helpers'
import { i18n } from '@/i18n'

import MarketModal from '@/features/market/components/MarketModal.vue'
import { makeTradeGood, mockMarketApi } from '@/features/market/__tests__/fixtures'

async function mountModal(props: {
  open: boolean
  systemSymbol: string | null
  waypointSymbol: string | null
}) {
  i18n.global.locale.value = 'en'
  const wrapper = mount(MarketModal, { props, global: { plugins: [i18n] } })
  await flushPromises()
  return wrapper
}

describe('MarketModal', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('fetches nothing while closed', () => {
    const stub = mockMarketApi('X1-XZ48', 'X1-XZ48-A1', [makeTradeGood()])
    mount(MarketModal, {
      props: { open: false, systemSymbol: 'X1-XZ48', waypointSymbol: 'X1-XZ48-A1' },
      global: { plugins: [i18n] },
    })
    expect(stub).not.toHaveBeenCalled()
  })

  it('lists exchange goods plainly and groups imports/exports under labelled sections', async () => {
    mockMarketApi('X1-XZ48', 'X1-XZ48-A1', [
      makeTradeGood({ symbol: 'FUEL', type: 'EXCHANGE', purchasePrice: 72, sellPrice: 68 }),
      makeTradeGood({ symbol: 'FOOD', type: 'IMPORT', purchasePrice: 4340, sellPrice: 2089 }),
      makeTradeGood({ symbol: 'IRON_ORE', type: 'EXPORT', purchasePrice: 30, sellPrice: 15 }),
    ])
    const wrapper = await mountModal({
      open: true,
      systemSymbol: 'X1-XZ48',
      waypointSymbol: 'X1-XZ48-A1',
    })

    const text = wrapper.text().replace(/\s+/g, ' ')
    expect(text).toContain('FUEL')
    expect(text).toContain('$72')
    expect(text).toContain('$68')
    expect(text).toContain('Imports')
    expect(text).toContain('FOOD')
    expect(text).toContain('$4,340')
    expect(text).toContain('$2,089')
    expect(text).toContain('Exports')
    expect(text).toContain('IRON_ORE')
  })

  it('formats prices for the active locale', async () => {
    mockMarketApi('X1-XZ48', 'X1-XZ48-A1', [
      makeTradeGood({ symbol: 'FOOD', purchasePrice: 4340, sellPrice: 2089 }),
    ])
    i18n.global.locale.value = 'fr'
    const wrapper = mount(MarketModal, {
      props: { open: true, systemSymbol: 'X1-XZ48', waypointSymbol: 'X1-XZ48-A1' },
      global: { plugins: [i18n] },
    })
    await flushPromises()

    // French groups thousands with a narrow no-break space, not a comma.
    expect(wrapper.text()).not.toContain('4,340')
    expect(wrapper.text().replace(/\s/g, ' ')).toContain('4 340')
  })

  it('shows a loading skeleton while fetching', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
    i18n.global.locale.value = 'en'
    const wrapper = mount(MarketModal, {
      props: { open: true, systemSymbol: 'X1-XZ48', waypointSymbol: 'X1-XZ48-A1' },
      global: { plugins: [i18n] },
    })
    expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(true)
  })

  it('shows an error with a retry button on failure', async () => {
    mockFetch(500, {})
    const wrapper = await mountModal({
      open: true,
      systemSymbol: 'X1-XZ48',
      waypointSymbol: 'X1-XZ48-A1',
    })
    expect(wrapper.find('[role="alert"]').text()).toContain('Could not load this market.')

    mockMarketApi('X1-XZ48', 'X1-XZ48-A1', [makeTradeGood({ symbol: 'FOOD' })])
    await wrapper.find('[role="alert"] button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('FOOD')
  })

  it('tells the user when there is nothing to show', async () => {
    mockMarketApi('X1-XZ48', 'X1-XZ48-A1', null)
    const wrapper = await mountModal({
      open: true,
      systemSymbol: 'X1-XZ48',
      waypointSymbol: 'X1-XZ48-A1',
    })
    expect(wrapper.text()).toContain('No trade data available for this market.')
  })

  it('emits close from its own close button', async () => {
    mockMarketApi('X1-XZ48', 'X1-XZ48-A1', [makeTradeGood()])
    const wrapper = await mountModal({
      open: true,
      systemSymbol: 'X1-XZ48',
      waypointSymbol: 'X1-XZ48-A1',
    })

    await wrapper.find('button[aria-label="Close"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})

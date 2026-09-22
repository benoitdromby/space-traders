import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import { i18n } from '@/i18n'

import PaginationControls from '@/components/PaginationControls.vue'

function mountPager(props: { page: number; totalPages: number; disabled?: boolean }) {
  i18n.global.locale.value = 'en'
  return mount(PaginationControls, { props, global: { plugins: [i18n] } })
}

const button = (wrapper: ReturnType<typeof mountPager>, label: string) =>
  wrapper.find(`button[aria-label="${label}"]`)

describe('PaginationControls', () => {
  it('shows the current position', () => {
    expect(mountPager({ page: 2, totalPages: 5 }).text().replace(/\s+/g, ' ')).toContain(
      'page 2 / 5',
    )
  })

  it('disables backward buttons on the first page', () => {
    const wrapper = mountPager({ page: 1, totalPages: 3 })
    expect(button(wrapper, 'First page').attributes('disabled')).toBeDefined()
    expect(button(wrapper, 'Previous page').attributes('disabled')).toBeDefined()
    expect(button(wrapper, 'Next page').attributes('disabled')).toBeUndefined()
  })

  it('disables forward buttons on the last page', () => {
    const wrapper = mountPager({ page: 3, totalPages: 3 })
    expect(button(wrapper, 'Next page').attributes('disabled')).toBeDefined()
    expect(button(wrapper, 'Last page').attributes('disabled')).toBeDefined()
  })

  it('emits the target page', async () => {
    const wrapper = mountPager({ page: 2, totalPages: 5 })
    await button(wrapper, 'Previous page').trigger('click')
    await button(wrapper, 'Next page').trigger('click')
    await button(wrapper, 'First page').trigger('click')
    await button(wrapper, 'Last page').trigger('click')
    expect(wrapper.emitted('change')).toEqual([[1], [3], [1], [5]])
  })

  it('disables everything while loading', () => {
    const wrapper = mountPager({ page: 2, totalPages: 5, disabled: true })
    expect(wrapper.findAll('button').every((b) => b.attributes('disabled') !== undefined)).toBe(
      true,
    )
  })
})

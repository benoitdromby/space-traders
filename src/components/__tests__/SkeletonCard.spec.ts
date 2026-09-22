import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import SkeletonCard from '@/components/SkeletonCard.vue'

describe('SkeletonCard', () => {
  it('is hidden from assistive technology', () => {
    const root = mount(SkeletonCard).find('li')
    expect(root.attributes('aria-hidden')).toBe('true')
  })

  it('lets the caller size it to the real card', () => {
    const wrapper = mount(SkeletonCard, { attrs: { class: 'min-h-35.5' } })
    expect(wrapper.classes()).toContain('min-h-35.5')
  })

  it('renders shimmering placeholder blocks', () => {
    expect(mount(SkeletonCard).findAll('.skeleton').length).toBeGreaterThan(0)
  })
})

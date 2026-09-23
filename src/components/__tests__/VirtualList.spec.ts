import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import VirtualList from '@/components/VirtualList.vue'

/** jsdom never reports a real `clientHeight`: fake one and re-trigger the component's own measure. */
function setClientHeight(el: HTMLElement, height: number) {
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: height })
}

function mountList(itemCount: number, options: { rowHeight?: number; maxHeight?: number } = {}) {
  const rowHeight = options.rowHeight ?? 50
  const maxHeight = options.maxHeight ?? 300
  const items = Array.from({ length: itemCount }, (_, i) => `item-${i}`)

  const wrapper = mount(VirtualList, {
    props: { items, rowHeight, maxHeight },
    slots: { row: '<template #row="{ item }">{{ item }}</template>' },
  })

  const container = wrapper.get('[role="list"]').element as HTMLElement
  setClientHeight(container, maxHeight)
  ;(wrapper.vm as unknown as { measure: () => void }).measure()

  return { wrapper, container }
}

describe('VirtualList', () => {
  it('is windowed: a long list renders far fewer rows than it has items', async () => {
    const { wrapper } = mountList(500)
    await wrapper.vm.$nextTick()

    const rendered = wrapper.findAll('[role="listitem"]').length
    expect(rendered).toBeGreaterThan(0)
    expect(rendered).toBeLessThan(50)
  })

  it('renders every item when the whole list fits inside the box', async () => {
    const { wrapper } = mountList(4, { maxHeight: 1000 })
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('[role="listitem"]')).toHaveLength(4)
  })

  it('positions each row at its own offset, not stacked at the top', async () => {
    const { wrapper } = mountList(4, { maxHeight: 1000, rowHeight: 50 })
    await wrapper.vm.$nextTick()

    const rows = wrapper.findAll('[role="listitem"]')
    expect((rows[0]!.element as HTMLElement).style.transform).toBe('translateY(0px)')
    expect((rows[1]!.element as HTMLElement).style.transform).toBe('translateY(50px)')
    expect((rows[3]!.element as HTMLElement).style.transform).toBe('translateY(150px)')
  })

  it('scrolls to reveal rows further down the list', async () => {
    const { wrapper, container } = mountList(500)
    await wrapper.vm.$nextTick()

    Object.defineProperty(container, 'scrollTop', { configurable: true, value: 10000 })
    await container.dispatchEvent(new Event('scroll'))
    await wrapper.vm.$nextTick()

    const rendered = wrapper.findAll('[role="listitem"]').map((row) => row.text())
    expect(rendered).toContain('item-200')
    expect(rendered).not.toContain('item-0')
  })

  it('emits reachEnd once the user scrolls near the bottom of what is loaded', async () => {
    const { wrapper, container } = mountList(20, { maxHeight: 300, rowHeight: 50 }) // 1000px total
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('reachEnd')).toBeUndefined()

    Object.defineProperty(container, 'scrollTop', { configurable: true, value: 690 }) // 10px from the 700px max
    await container.dispatchEvent(new Event('scroll'))

    expect(wrapper.emitted('reachEnd')).toHaveLength(1)
  })

  it('does not emit reachEnd while still far from the bottom', async () => {
    const { wrapper, container } = mountList(500)
    await wrapper.vm.$nextTick()

    Object.defineProperty(container, 'scrollTop', { configurable: true, value: 500 })
    await container.dispatchEvent(new Event('scroll'))

    expect(wrapper.emitted('reachEnd')).toBeUndefined()
  })

  it('re-checks reachEnd when more items arrive without a new scroll event', async () => {
    const { wrapper } = mountList(6, { maxHeight: 300, rowHeight: 50 }) // 300px of content in a 300px box
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('reachEnd')).toHaveLength(1) // already at the bottom as soon as it fits

    await wrapper.setProps({ items: Array.from({ length: 7 }, (_, i) => `item-${i}`) })

    expect(wrapper.emitted('reachEnd')!.length).toBeGreaterThanOrEqual(2)
  })
})

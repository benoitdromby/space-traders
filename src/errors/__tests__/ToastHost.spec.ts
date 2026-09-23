import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import { i18n } from '@/i18n'
import { dismissToast, pushToast, useToasts } from '@/errors/toasts'

import ToastHost from '@/errors/components/ToastHost.vue'

function mountHost() {
  i18n.global.locale.value = 'en'
  return mount(ToastHost, { global: { plugins: [i18n] } })
}

describe('ToastHost', () => {
  beforeEach(() => {
    const { toasts } = useToasts()
    for (const toast of [...toasts.value]) dismissToast(toast.id)
  })

  it('renders nothing when there are no toasts', () => {
    const wrapper = mountHost()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('shows a queued toast', () => {
    pushToast('Something went wrong.')
    const wrapper = mountHost()
    expect(wrapper.find('[role="alert"]').text()).toContain('Something went wrong.')
  })

  it('shows more than one toast at once', () => {
    pushToast('First problem')
    pushToast('Second problem')
    const wrapper = mountHost()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(2)
  })

  it('dismisses a toast when its close button is clicked', async () => {
    pushToast('Something went wrong.')
    const wrapper = mountHost()

    await wrapper.find('[role="alert"] button').trigger('click')

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(useToasts().toasts.value).toHaveLength(0)
  })

  it('reflects new toasts pushed after it has mounted', async () => {
    const wrapper = mountHost()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)

    pushToast('Arrived later')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[role="alert"]').text()).toContain('Arrived later')
  })
})

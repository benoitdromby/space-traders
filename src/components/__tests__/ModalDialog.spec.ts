import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ModalDialog from '@/components/ModalDialog.vue'

function mountDialog(open: boolean) {
  return mount(ModalDialog, {
    props: { open, labelledby: 'heading' },
    slots: { default: '<h2 id="heading">Title</h2><p>Body</p>' },
  })
}

describe('ModalDialog', () => {
  it('is closed when open is false', () => {
    const wrapper = mountDialog(false)
    expect(wrapper.find('dialog').element.open).toBe(false)
  })

  it('opens when open becomes true', async () => {
    const wrapper = mountDialog(false)
    await wrapper.setProps({ open: true })
    expect(wrapper.find('dialog').element.open).toBe(true)
  })

  it('closes when open becomes false again', async () => {
    const wrapper = mountDialog(true)
    expect(wrapper.find('dialog').element.open).toBe(true)
    await wrapper.setProps({ open: false })
    expect(wrapper.find('dialog').element.open).toBe(false)
  })

  it('renders whatever content is given via the default slot', () => {
    const wrapper = mountDialog(true)
    expect(wrapper.text()).toContain('Title')
    expect(wrapper.text()).toContain('Body')
  })

  it('emits close when the dialog itself is clicked (the backdrop)', async () => {
    const wrapper = mountDialog(true)
    await wrapper.find('dialog').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('does not emit close when content inside the dialog is clicked', async () => {
    const wrapper = mountDialog(true)
    await wrapper.find('p').trigger('click')
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('emits close when the dialog closes itself (e.g. the user pressed Escape)', async () => {
    const wrapper = mountDialog(true)
    await wrapper.find('dialog').trigger('close')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import { i18n } from '@/i18n'

import TokenForm from '@/features/auth/components/TokenForm.vue'

function mountForm(props: { errorCode?: 'invalidToken' | null; connecting?: boolean } = {}) {
  i18n.global.locale.value = 'en'
  return mount(TokenForm, {
    props: { errorCode: null, connecting: false, ...props },
    global: { plugins: [i18n] },
  })
}

describe('TokenForm', () => {
  it('masks the token field', () => {
    expect(mountForm().find('input').attributes('type')).toBe('password')
  })

  it('disables the button until something is typed', async () => {
    const wrapper = mountForm()
    const button = wrapper.find('button[type="submit"]')
    expect(button.attributes('disabled')).toBeDefined()

    await wrapper.find('input').setValue('abc')
    expect(button.attributes('disabled')).toBeUndefined()
  })

  it('emits the trimmed token on submit, then clears the field', async () => {
    const wrapper = mountForm()
    await wrapper.find('input').setValue('  abc  ')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('connect')).toEqual([['abc']])
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')
  })

  it('announces errors accessibly', () => {
    const wrapper = mountForm({ errorCode: 'invalidToken' })
    expect(wrapper.find('[role="alert"]').text()).toContain('rejected')
    expect(wrapper.find('input').attributes('aria-invalid')).toBe('true')
  })

  // Regression coverage for a real bug: the button used to go back to its idle label the moment
  // the agent fetch resolved, even though the caller was still loading the fleet and navigating
  // away, which showed the splash page again for an instant before the dashboard took over. This
  // page's own pending state now spans that whole flow instead of a separate full-screen one.
  it('disables the field and shows a pending state while connecting', () => {
    const wrapper = mountForm({ connecting: true })
    const button = wrapper.find('button[type="submit"]')

    expect(button.attributes('disabled')).toBeDefined()
    expect(button.attributes('aria-busy')).toBe('true')
    expect(button.text()).toContain('Connecting')
    expect(wrapper.find('input').attributes('disabled')).toBeDefined()
  })

  it('ignores a submit while already connecting', async () => {
    const wrapper = mountForm({ connecting: true })
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('connect')).toBeUndefined()
  })
})

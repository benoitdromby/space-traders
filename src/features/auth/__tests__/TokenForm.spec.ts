import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import { i18n } from '@/i18n'

import TokenForm from '@/features/auth/components/TokenForm.vue'

function mountForm(props: { errorCode?: 'invalidToken' | null } = {}) {
  i18n.global.locale.value = 'en'
  return mount(TokenForm, {
    props: { errorCode: null, ...props },
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
})

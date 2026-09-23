import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'

import { AGENT } from '@/__tests__/helpers'
import { i18n } from '@/i18n'
import { useAuthStore } from '@/features/auth/stores/authStore'

import DashboardView from '@/features/dashboard/views/DashboardView.vue'

describe('DashboardView', () => {
  // Regression test: the disconnect button used to also call router.replace() itself, racing
  // App.vue's own watcher on auth.isConnected — see App.spec.ts for the full story. This just
  // checks the button's own responsibility: ending the session, and nothing more.
  it('ends the session when the disconnect button is clicked', async () => {
    setActivePinia(createPinia())
    const auth = useAuthStore()
    auth.agent = AGENT
    i18n.global.locale.value = 'en'
    const wrapper = mount(DashboardView, { global: { plugins: [i18n] } })

    expect(wrapper.text()).toContain(AGENT.symbol)
    await wrapper.find('button').trigger('click')

    expect(auth.isConnected).toBe(false)
  })
})

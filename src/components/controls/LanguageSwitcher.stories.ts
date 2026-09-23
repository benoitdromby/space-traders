import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import LanguageSwitcher from '@/components/controls/LanguageSwitcher.vue'
import { i18n } from '@/i18n'

const meta: Meta<typeof LanguageSwitcher> = {
  title: 'Components/Controls/LanguageSwitcher',
  component: LanguageSwitcher,
}
export default meta

type Story = StoryObj<typeof LanguageSwitcher>

export const Default: Story = {}

/** Switching languages here changes every translated string across the whole app — this only
 * lasts for the story itself: .storybook/preview.ts resets the locale back to English before
 * whichever story runs next. */
export const SwitchToFrench: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.selectOptions(canvas.getByRole('combobox'), 'fr')

    await waitFor(() => expect(i18n.global.locale.value).toBe('fr'))
  },
}

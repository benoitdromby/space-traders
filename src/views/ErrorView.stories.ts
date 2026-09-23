import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'

import ErrorView from '@/views/ErrorView.vue'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { MOCK_AGENT } from '@/mocks/data'

const meta: Meta<typeof ErrorView> = {
  title: 'App/ErrorView',
  component: ErrorView,
}
export default meta

type Story = StoryObj<typeof ErrorView>

export const NoShips: Story = {
  args: { reason: 'no-ships' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("This can't be shown")).toBeInTheDocument()
    // Going back to "/" would just land right back here — no point offering that link.
    await expect(canvas.queryByText('Back to home')).not.toBeInTheDocument()
  },
}

export const NotFound: Story = {
  args: { reason: 'not-found' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('Lost in space')).toBeInTheDocument()
    await expect(canvas.getByText('Back to home')).toBeInTheDocument()
  },
}

/** An unrecognised reason (a stale link, a typo) still shows something useful. */
export const UnrecognisedReason: Story = {
  args: { reason: 'something-nobody-registered' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByText('Something went wrong and this page cannot be shown.'),
    ).toBeInTheDocument()
  },
}

/** Reached while still signed in (e.g. a mid-transit "no ships" edge case): the topbar keeps
 * the agent summary and a disconnect button, same as the dashboard. */
export const SignedIn: Story = {
  args: { reason: 'no-ships' },
  render: (args) => ({
    components: { ErrorView },
    setup() {
      useAuthStore().agent = MOCK_AGENT
      return { args }
    },
    template: '<ErrorView v-bind="args" />',
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('LEO')).toBeInTheDocument()

    await userEvent.click(canvas.getByRole('button', { name: 'Disconnect' }))

    await expect(canvas.queryByRole('button', { name: 'Disconnect' })).not.toBeInTheDocument()
  },
}

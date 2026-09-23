import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import ToastHost from '@/errors/components/ToastHost.vue'
import { dismissToast, pushToast, useToasts } from '@/errors/toasts'

/** Toasts are a plain module-level singleton (see toasts.ts) — not reset per story the way
 * Pinia is, so every story clears it first to start from a known, empty state. */
function resetToasts() {
  const { toasts } = useToasts()
  for (const toast of [...toasts.value]) dismissToast(toast.id)
}

const meta: Meta<typeof ToastHost> = {
  title: 'Errors/ToastHost',
  component: ToastHost,
  render: () => ({
    components: { ToastHost },
    template: '<ToastHost />',
  }),
}
export default meta

type Story = StoryObj<typeof ToastHost>

export const Empty: Story = {
  play: () => resetToasts(),
}

/** What the global error handler shows for anything no feature's own error handling caught. */
export const OneToast: Story = {
  play: async ({ canvasElement }) => {
    resetToasts()
    pushToast('Something went wrong. Please try again.')

    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getByRole('alert')).toBeInTheDocument())
  },
}

export const MultipleToasts: Story = {
  play: async ({ canvasElement }) => {
    resetToasts()
    pushToast('First problem')
    pushToast('Second, unrelated problem')

    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getAllByRole('alert')).toHaveLength(2))
  },
}

/** Clicking a toast's own close button dismisses just that one. */
export const DismissInteraction: Story = {
  play: async ({ canvasElement }) => {
    resetToasts()
    pushToast('Dismiss me')

    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getByRole('alert')).toBeInTheDocument())

    await userEvent.click(canvas.getByRole('button', { name: 'Close' }))

    await waitFor(() => expect(canvas.queryByRole('alert')).not.toBeInTheDocument())
  },
}

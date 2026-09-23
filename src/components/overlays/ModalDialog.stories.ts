import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import ModalDialog from '@/components/overlays/ModalDialog.vue'

const meta: Meta<typeof ModalDialog> = {
  title: 'Components/Overlays/ModalDialog',
  component: ModalDialog,
  render: (args) => ({
    components: { ModalDialog },
    setup: () => ({ args }),
    template: `
      <ModalDialog v-bind="args">
        <div class="w-80 p-4">
          <h2 id="demo-heading" class="mb-2 font-mono text-[13px] font-bold text-ink-hi">Demo dialog</h2>
          <p class="text-ink">Generic content — the caller supplies everything inside.</p>
        </div>
      </ModalDialog>
    `,
  }),
  args: { open: true, labelledby: 'demo-heading', onClose: fn() },
}
export default meta

type Story = StoryObj<typeof ModalDialog>

export const Open: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getByRole('dialog')).toBeVisible())
  },
}

export const Closed: Story = {
  args: { open: false },
  play: async ({ canvasElement }) => {
    const dialog = canvasElement.querySelector('dialog')
    await expect(dialog?.open).toBe(false)
  },
}

/** Clicking the backdrop (outside the content, but still inside the <dialog> box) closes it. */
export const BackdropClickCloses: Story = {
  play: async ({ args, canvasElement }) => {
    const dialog = canvasElement.querySelector('dialog')!
    await userEvent.click(dialog) // a click on the <dialog> element itself is the backdrop
    await expect(args.onClose).toHaveBeenCalled()
  },
}

export const ContentClickDoesNotClose: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByText('Demo dialog'))
    await expect(args.onClose).not.toHaveBeenCalled()
  },
}

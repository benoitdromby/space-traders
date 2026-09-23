import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { expect, userEvent, within } from 'storybook/test'

import PaginationControls from '@/components/lists/PaginationControls.vue'

const meta: Meta<typeof PaginationControls> = {
  title: 'Components/Lists/PaginationControls',
  component: PaginationControls,
  // Fully controlled by its parent in real usage (FleetList owns `page`) — this wrapper plays
  // that role here, so clicking actually moves between pages instead of just firing an event
  // into the void.
  render: (args) => ({
    components: { PaginationControls },
    setup() {
      const page = ref(args.page)
      return { args, page }
    },
    template: '<PaginationControls v-bind="args" :page="page" @change="page = $event" />',
  }),
  args: { page: 2, totalPages: 5 },
}
export default meta

type Story = StoryObj<typeof PaginationControls>

export const MiddlePage: Story = {}

export const FirstPage: Story = {
  args: { page: 1 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('button', { name: 'First page' })).toBeDisabled()
    await expect(canvas.getByRole('button', { name: 'Previous page' })).toBeDisabled()
  },
}

export const LastPage: Story = {
  args: { page: 5 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('button', { name: 'Next page' })).toBeDisabled()
    await expect(canvas.getByRole('button', { name: 'Last page' })).toBeDisabled()
  },
}

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    for (const label of ['First page', 'Previous page', 'Next page', 'Last page']) {
      await expect(canvas.getByRole('button', { name: label })).toBeDisabled()
    }
  },
}

/** Clicking through actually moves the displayed page — see the render function above. */
export const ClickThrough: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('2')).toBeInTheDocument()

    await userEvent.click(canvas.getByRole('button', { name: 'Next page' }))
    await expect(canvas.getByText('3')).toBeInTheDocument()

    await userEvent.click(canvas.getByRole('button', { name: 'Last page' }))
    await expect(canvas.getByText('5')).toBeInTheDocument()

    await userEvent.click(canvas.getByRole('button', { name: 'First page' }))
    await expect(canvas.getByText('1')).toBeInTheDocument()
  },
}

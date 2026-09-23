import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { http, HttpResponse } from 'msw'

import MarketModal from '@/features/market/components/MarketModal.vue'
import { apiError } from '@/mocks/data'
import { marketHandler } from '@/mocks/handlers'

const meta: Meta<typeof MarketModal> = {
  title: 'Market/MarketModal',
  component: MarketModal,
  render: (args) => ({
    components: { MarketModal },
    setup: () => ({ args }),
    template: '<MarketModal v-bind="args" />',
  }),
  args: {
    open: true,
    systemSymbol: 'X1-XZ48',
    waypointSymbol: 'X1-XZ48-A1',
    onClose: fn(),
  },
  parameters: { msw: [marketHandler('X1-XZ48', 'X1-XZ48-A1')] },
}
export default meta

type Story = StoryObj<typeof MarketModal>

export const Loaded: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('FUEL')).toBeInTheDocument()
    await expect(await canvas.findByText('Imports')).toBeInTheDocument()
    await expect(await canvas.findByText('$72')).toBeInTheDocument()
  },
}

export const Loading: Story = {
  parameters: {
    msw: [
      http.get(
        '*/systems/:system/waypoints/:waypoint/market',
        async () => await new Promise(() => {}),
      ),
    ],
  },
}

export const LoadError: Story = {
  parameters: {
    msw: [
      http.get('*/systems/:system/waypoints/:waypoint/market', () =>
        HttpResponse.json(apiError('boom'), { status: 500 }),
      ),
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('Could not load this market.')).toBeInTheDocument()
  },
}

/** No ship is actually there yet: the market's trade goods aren't visible to anyone. */
export const NoTradeData: Story = {
  parameters: { msw: [marketHandler('X1-XZ48', 'X1-XZ48-A1', null)] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      await canvas.findByText('No trade data available for this market.'),
    ).toBeInTheDocument()
  },
}

export const CloseInteraction: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('FUEL')).toBeInTheDocument()

    await userEvent.click(canvas.getByRole('button', { name: 'Close' }))

    await expect(args.onClose).toHaveBeenCalled()
  },
}

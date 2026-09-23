import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'
import { http, HttpResponse } from 'msw'

import LocationPanel from '@/features/location/components/LocationPanel.vue'
import { apiError, makeMockShip } from '@/mocks/data'
import { marketHandler, systemHandler, waypointsHandlers } from '@/mocks/handlers'

const meta: Meta<typeof LocationPanel> = {
  title: 'Location/LocationPanel',
  component: LocationPanel,
  render: (args) => ({
    components: { LocationPanel },
    setup: () => ({ args }),
    template: '<div class="w-150"><LocationPanel v-bind="args" /></div>',
  }),
  args: { fleetLoaded: true },
  parameters: {
    msw: [
      systemHandler(),
      ...waypointsHandlers('X1-XZ48', [
        {
          symbol: 'X1-XZ48-A1',
          type: 'PLANET',
          x: 24,
          y: 6,
          faction: { symbol: 'GALACTIC' },
          hasMarketplace: true,
        },
      ]),
    ],
  },
}
export default meta

type Story = StoryObj<typeof LocationPanel>

export const Loading: Story = {
  args: { ship: makeMockShip(1), fleetLoaded: false },
}

export const Loaded: Story = {
  args: { ship: makeMockShip(1) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('X1-XZ48')).toBeInTheDocument()
    await expect(await canvas.findByText('Current waypoint')).toBeInTheDocument()
  },
}

export const Traveling: Story = {
  args: {
    ship: makeMockShip(1, {
      status: 'IN_TRANSIT',
      waypointSymbol: 'X1-XZ48-A1',
      arrival: '2099-01-01T00:00:00.000Z',
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('Destination')).toBeInTheDocument()
    await expect(await canvas.findByText('In transit')).toBeInTheDocument()
  },
}

export const NoShip: Story = {
  args: { ship: null },
}

export const LoadError: Story = {
  args: { ship: makeMockShip(1) },
  parameters: {
    msw: [
      http.get('*/systems/:system', () => HttpResponse.json(apiError('boom'), { status: 500 })),
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('Could not load this location.')).toBeInTheDocument()
  },
}

/** Clicking the marketplace icon opens the market popin for this waypoint. */
export const OpenMarket: Story = {
  args: { ship: makeMockShip(1) },
  parameters: {
    msw: [
      systemHandler(),
      ...waypointsHandlers('X1-XZ48', [
        {
          symbol: 'X1-XZ48-A1',
          type: 'PLANET',
          x: 24,
          y: 6,
          faction: { symbol: 'GALACTIC' },
          hasMarketplace: true,
        },
      ]),
      marketHandler('X1-XZ48', 'X1-XZ48-A1'),
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const marketButton = await canvas.findByRole('button', { name: 'Marketplace' })

    await userEvent.click(marketButton)

    // The dialog stays in the same place in the DOM (showModal only changes how it's painted),
    // so it's still reachable through the same canvas.
    await expect(await canvas.findByRole('heading', { name: 'Marketplace' })).toBeVisible()
    await expect(await canvas.findByText('FUEL')).toBeInTheDocument()
  },
}

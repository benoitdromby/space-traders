import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import DashboardView from '@/features/dashboard/views/DashboardView.vue'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { useFleetStore } from '@/features/fleet/stores/fleetStore'
import { makeMockFleet, makeMockShip, makeMockWaypoints, MOCK_AGENT } from '@/mocks/data'
import { fleetHandlers, marketHandler, systemHandler, waypointsHandlers } from '@/mocks/handlers'
import { textMatch } from '@/mocks/testUtils'

/**
 * The whole app as a signed-in user actually sees it: topbar, location, fleet and waypoints
 * together, backed by the same store wiring the real router guard sets up (simulated here since
 * stories don't go through routing — except selection, which .storybook/preview.ts's own router
 * guard *does* reproduce, since a story can actually click through it).
 */
const meta: Meta<typeof DashboardView> = {
  title: 'App/Dashboard',
  component: DashboardView,
  render: () => ({
    components: { DashboardView },
    setup() {
      useAuthStore().agent = MOCK_AGENT
      void useFleetStore().load()
      return {}
    },
    template: '<DashboardView />',
  }),
  parameters: {
    msw: [
      ...fleetHandlers(makeMockFleet(7)),
      systemHandler(),
      ...waypointsHandlers('X1-XZ48', makeMockWaypoints(24)),
      marketHandler('X1-XZ48', 'X1-XZ48-A1'),
    ],
  },
}
export default meta

type Story = StoryObj<typeof DashboardView>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('LEO')).toBeInTheDocument()
    // "Fleet · 7 ships": the count sits in its own element apart from "Fleet", so the default
    // text matcher (direct text-node children only) can never find it as one piece.
    await expect(await canvas.findByText(textMatch('Fleet · 7 ships'))).toBeInTheDocument()
    await expect(await canvas.findByText('X1-XZ48')).toBeInTheDocument()
  },
}

/** Selecting a different ship in the fleet updates the location and waypoints panels together. */
export const SelectingAShip: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('LEO-2')).toBeInTheDocument()

    await userEvent.click(canvas.getByRole('button', { name: /LEO-2/ }))

    // Goes through the same router navigation a real click does — .storybook/preview.ts's own
    // guard is what turns that into `fleet.selectedShip` actually changing.
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: /LEO-2/ })).toHaveAttribute('aria-pressed', 'true'),
    )
  },
}

/** The full round trip: open the market from the location panel, see real prices, close it. */
export const OpeningTheMarket: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const marketButton = await canvas.findByRole('button', { name: 'Marketplace' })

    await userEvent.click(marketButton)

    await expect(await canvas.findByRole('heading', { name: 'Marketplace' })).toBeVisible()
    await expect(await canvas.findByText('FUEL')).toBeInTheDocument()

    await userEvent.click(canvas.getByRole('button', { name: 'Close' }))

    await waitFor(() => expect(canvas.queryByRole('heading', { name: 'Marketplace' })).toBeNull())
  },
}

/** A ship already mid-transit when the page loads: consistent "in transit" state everywhere. */
export const WithATravelingShip: Story = {
  parameters: {
    msw: [
      ...fleetHandlers([
        makeMockShip(1, {
          status: 'IN_TRANSIT',
          waypointSymbol: 'X1-XZ48-W2',
          arrival: '2099-01-01T00:00:00.000Z',
        }),
        makeMockShip(2),
      ]),
      systemHandler(),
      ...waypointsHandlers('X1-XZ48', makeMockWaypoints(24)),
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getAllByText('In transit').length).toBeGreaterThan(0))
    // The location panel's own data (system + waypoint detail) is a separate, slower fetch chain
    // than the fleet list's — "In transit" (the ShipCard badge) can appear well before this does,
    // and the default 1s retry window isn't always enough for it on a cold run.
    await expect(await canvas.findByText('Destination', {}, { timeout: 3000 })).toBeInTheDocument()
  },
}

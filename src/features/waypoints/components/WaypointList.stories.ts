import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { http, HttpResponse } from 'msw'

import WaypointList from '@/features/waypoints/components/WaypointList.vue'
import { useFleetStore } from '@/features/fleet/stores/fleetStore'
import { apiError, makeMockShip, makeMockWaypoints } from '@/mocks/data'
import { fleetHandlers, insufficientFuelHandler, waypointsHandlers } from '@/mocks/handlers'
import type { Ship } from '@/features/fleet/types/ship'

const SYSTEM = 'X1-XZ48'
const baseWaypointHandlers = () => waypointsHandlers(SYSTEM, makeMockWaypoints(24))

const meta: Meta<typeof WaypointList> = {
  title: 'Waypoints/WaypointList',
  component: WaypointList,
  // navigateShip (used by the travel button) looks the ship up in the fleet store by symbol —
  // seeded here the same way DashboardView's real `fleet.selectedShip` would be.
  render: (args) => ({
    components: { WaypointList },
    setup() {
      const fleet = useFleetStore()
      if (args.ship) {
        fleet.ships = [args.ship as Ship]
        fleet.selectedShip = args.ship as Ship
      }
      return { args }
    },
    template: '<div class="w-100"><WaypointList v-bind="args" /></div>',
  }),
  args: { fleetLoaded: true },
  parameters: { msw: baseWaypointHandlers() },
}
export default meta

type Story = StoryObj<typeof WaypointList>

export const Loading: Story = {
  args: { ship: makeMockShip(1), fleetLoaded: false },
}

export const Loaded: Story = {
  args: { ship: makeMockShip(1) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('Here')).toBeInTheDocument()
    // findAllByText, not getAllByText: "Here" and a row's own "Distance:" span can land in two
    // separate DOM patches a tick apart, so this still needs its own retry rather than assuming
    // it's already settled the instant "Here" resolved.
    await waitFor(() => expect(canvas.getAllByText(/Distance:/).length).toBeGreaterThan(0))
  },
}

export const NoShip: Story = {
  args: { ship: null },
}

export const Empty: Story = {
  args: { ship: makeMockShip(1) },
  parameters: { msw: waypointsHandlers('X1-XZ48', []) },
}

export const LoadError: Story = {
  args: { ship: makeMockShip(1) },
  parameters: {
    msw: [
      http.get('*/systems/:system/waypoints', () =>
        HttpResponse.json(apiError('boom'), { status: 500 }),
      ),
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('Could not load waypoints.')).toBeInTheDocument()
  },
}

/** Already mid-transit when the page loads: no waypoint reads as "Here" until it actually arrives. */
export const Traveling: Story = {
  args: {
    ship: makeMockShip(1, {
      status: 'IN_TRANSIT',
      waypointSymbol: 'X1-XZ48-W2',
      arrival: '2099-01-01T00:00:00.000Z',
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText(/In transit to/)).toBeInTheDocument()
    await waitFor(() => expect(canvas.queryByText('Here')).toBeNull())
  },
}

/** Clicking a waypoint's travel icon sends the ship there. */
export const SendShipTraveling: Story = {
  args: { ship: makeMockShip(1, { status: 'IN_ORBIT' }) },
  parameters: {
    // Story-level `msw` replaces the meta-level array entirely rather than merging with it, so
    // the base waypoint handlers have to be repeated here alongside the navigate handler
    // (borrowed from fleetHandlers, which is where dock/orbit/navigate actually live) — without
    // it, POST navigate falls through to a real (failing) network request.
    msw: [...baseWaypointHandlers(), ...fleetHandlers([makeMockShip(1, { status: 'IN_ORBIT' })])],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const travelButton = await canvas.findByTitle(/Travel to X1-XZ48-W2/)

    await userEvent.click(travelButton)

    await expect(await canvas.findByText(/In transit to X1-XZ48-W2/)).toBeInTheDocument()
  },
}

/** The trip costs more fuel than the ship is carrying. */
export const InsufficientFuel: Story = {
  args: { ship: makeMockShip(1, { status: 'IN_ORBIT' }) },
  // Same reasoning as SendShipTraveling above: the base waypoint handlers have to be repeated
  // here too, or the list never loads far enough to reach the travel button in the first place.
  parameters: { msw: [...baseWaypointHandlers(), insufficientFuelHandler(500, 300)] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const travelButton = await canvas.findByTitle(/Travel to X1-XZ48-W2/)

    await userEvent.click(travelButton)

    const alert = await canvas.findByRole('alert')
    await expect(alert).toHaveTextContent('needs 500')
    await expect(alert).toHaveTextContent('has 300')
  },
}

/** A long list stays windowed: far fewer rows in the DOM than there are waypoints. */
export const LongListIsWindowed: Story = {
  args: { ship: makeMockShip(1) },
  parameters: { msw: waypointsHandlers('X1-XZ48', makeMockWaypoints(90)) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('Here')).toBeInTheDocument()
    const rows = canvasElement.querySelectorAll('[role="listitem"]')
    await expect(rows.length).toBeGreaterThan(0)
    await expect(rows.length).toBeLessThan(90)
  },
}

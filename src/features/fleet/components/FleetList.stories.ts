import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'
import { http, HttpResponse } from 'msw'

import FleetList from '@/features/fleet/components/FleetList.vue'
import { useFleetStore } from '@/features/fleet/stores/fleetStore'
import { apiError, makeMockFleet } from '@/mocks/data'
import { fleetHandlers } from '@/mocks/handlers'
import { textMatch } from '@/mocks/testUtils'

const meta: Meta<typeof FleetList> = {
  title: 'Fleet/FleetList',
  component: FleetList,
  // In the real app the router guard loads the fleet before DashboardView ever mounts; here
  // that's simulated by loading it as soon as this wrapper is set up.
  render: () => ({
    components: { FleetList },
    setup() {
      void useFleetStore().load()
      return {}
    },
    template: '<div class="w-120"><FleetList /></div>',
  }),
}
export default meta

type Story = StoryObj<typeof FleetList>

/** Three ships or fewer: pagination stays hidden. */
export const Default: Story = {
  parameters: { msw: fleetHandlers(makeMockFleet(3)) },
}

export const Loading: Story = {
  parameters: {
    msw: [http.get('*/my/ships', async () => await new Promise(() => {}))], // never resolves
  },
}

export const Empty: Story = {
  parameters: { msw: fleetHandlers([]) },
}

export const LoadError: Story = {
  parameters: {
    msw: [http.get('*/my/ships', () => HttpResponse.json(apiError('boom'), { status: 500 }))],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // findByText, not getByText: the fleet load is fired (unawaited) from the wrapper's
    // setup() above, so the story still shows its loading skeleton for a moment after mount.
    await expect(await canvas.findByText('Could not load your fleet.')).toBeInTheDocument()
  },
}

/** Seven ships: pagination appears, three per page. */
export const Paginated: Story = {
  parameters: { msw: fleetHandlers(makeMockFleet(7)) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The page number sits in its own <span> apart from the "page"/"/ 3" text around it, so the
    // default text matcher (which only looks at an element's own direct text) can never find
    // "page 1 / 3" as one piece — textMatch compares the whole (recursive) text content instead.
    await expect(await canvas.findByText(textMatch('page 1 / 3'))).toBeInTheDocument()

    await userEvent.click(canvas.getByRole('button', { name: 'Next page' }))

    await expect(await canvas.findByText(textMatch('page 2 / 3'))).toBeInTheDocument()
    await expect(await canvas.findByText('LEO-4')).toBeInTheDocument()
  },
}

/** Toggling one ship's dock/orbit state doesn't disturb the others. */
export const ToggleDocking: Story = {
  parameters: { msw: fleetHandlers(makeMockFleet(2)) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('LEO-1')).toBeInTheDocument()

    const toggleButtons = await canvas.findAllByRole('button', { name: /Enter orbit|Dock/ })
    await userEvent.click(toggleButtons[0]!)

    await expect(await canvas.findByText('Dock')).toBeInTheDocument() // LEO-1 flipped to IN_ORBIT
  },
}

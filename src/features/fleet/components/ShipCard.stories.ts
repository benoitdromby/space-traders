import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import ShipCard from '@/features/fleet/components/ShipCard.vue'
import { makeMockShip } from '@/mocks/data'

// Bare `Meta` (via `satisfies`, not `: Meta`) rather than `Meta<typeof ShipCard>`: the latter
// fights the two kebab-case emits (Vue's generated prop types keep them as "onToggle-docking",
// not the camelCase Storybook's Actions convention wants) for no real benefit — `satisfies`
// still infers `args`'s real shape for `StoryObj<typeof meta>` below to use.
const meta = {
  title: 'Fleet/ShipCard',
  component: ShipCard,
  // A bare <li> isn't valid outside a list — every story renders it inside one, matching how
  // FleetList actually uses it.
  render: (args) => ({
    components: { ShipCard },
    setup: () => ({ args }),
    template: `
      <ul class="flex w-90 flex-col gap-1.5">
        <ShipCard
          v-bind="args"
          @select="args.onSelect"
          @toggle-docking="args.onToggleDocking"
          @change-flight-mode="args.onChangeFlightMode"
        />
      </ul>
    `,
  }),
  args: {
    selected: false,
    toggling: false,
    toggleError: null,
    changingMode: false,
    modeError: null,
    onSelect: fn(),
    onToggleDocking: fn(),
    onChangeFlightMode: fn(),
  },
} satisfies Meta
export default meta

type Story = StoryObj<typeof meta>

export const Docked: Story = {
  args: { ship: makeMockShip(1, { status: 'DOCKED' }) },
}

export const InOrbit: Story = {
  args: { ship: makeMockShip(1, { status: 'IN_ORBIT' }) },
}

export const InTransit: Story = {
  args: {
    ship: makeMockShip(1, { status: 'IN_TRANSIT', arrival: '2099-01-01T00:00:00.000Z' }),
  },
  parameters: {
    docs: {
      description: {
        story: 'No dock/orbit action while travelling — there is nowhere to send that request yet.',
      },
    },
  },
}

export const Selected: Story = {
  args: { ship: makeMockShip(1), selected: true },
}

export const LowFuelAndCargo: Story = {
  args: {
    ship: makeMockShip(1, {
      cargo: { units: 38, capacity: 40 },
      fuel: { current: 12, capacity: 400 },
    }),
  },
}

export const ActionPending: Story = {
  args: { ship: makeMockShip(1), toggling: true },
}

export const ActionFailed: Story = {
  args: { ship: makeMockShip(1), toggleError: 'Could not update this ship. Try again.' },
}

/** The three emits this story's `args` carry — typed explicitly because Storybook infers `args`
 * from `component: ShipCard`'s generated props, which (see the note above `meta`) keep the two
 * kebab-case event names literally rather than camelCasing them. */
interface ShipCardEmitArgs {
  onSelect: ReturnType<typeof fn>
  onToggleDocking: ReturnType<typeof fn>
  onChangeFlightMode: ReturnType<typeof fn>
}

/** Clicking the card selects it; the toggle button and flight-mode select each fire their own event. */
export const Interactions: Story = {
  args: { ship: makeMockShip(1, { status: 'DOCKED' }) },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const emits = args as unknown as ShipCardEmitArgs

    await userEvent.click(canvas.getByRole('button', { name: /LEO-1/ }))
    await expect(emits.onSelect).toHaveBeenCalledWith('LEO-1')

    await userEvent.click(canvas.getByRole('button', { name: /Enter orbit/i }))
    await expect(emits.onToggleDocking).toHaveBeenCalledWith('LEO-1')

    await userEvent.selectOptions(canvas.getByRole('combobox'), 'BURN')
    await expect(emits.onChangeFlightMode).toHaveBeenCalledWith('LEO-1', 'BURN')
  },
}

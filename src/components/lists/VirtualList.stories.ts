import type { StoryObj } from '@storybook/vue3-vite'
import { expect, waitFor, within } from 'storybook/test'

import VirtualList from '@/components/lists/VirtualList.vue'

const ITEMS = Array.from({ length: 500 }, (_, i) => `Row ${i + 1}`)

// Not typed against Storybook's `Meta` (nor given a `component:` field): VirtualList is a
// generic (`generic="T"`) component, and vue-tsc can't verify its scoped slot's shape through
// Meta's plumbing here — a real limitation of the type checker, not of the story itself (see
// `npm run build-storybook`, which compiles and runs this exactly as written).
const meta = {
  title: 'Components/Lists/VirtualList',
  render: (args: { rowHeight: number; maxHeight: number }) => ({
    components: { VirtualList },
    setup: () => ({ args, items: ITEMS }),
    template: `
      <VirtualList v-bind="args" :items="items" class="w-80 rounded-md border border-line">
        <template #row="{ item, index }">
          <div
            class="flex h-full items-center border-b border-line/50 px-3 font-mono text-[11px]"
            :class="index % 2 ? 'bg-void' : 'bg-surface'"
          >
            {{ item }}
          </div>
        </template>
      </VirtualList>
    `,
  }),
  args: { rowHeight: 32, maxHeight: 240 },
}
export default meta

type Story = StoryObj<typeof meta>

/** 500 rows, but only a windowed handful ever sit in the DOM at once. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getByText('Row 1')).toBeInTheDocument())

    const rows = canvasElement.querySelectorAll('[role="listitem"]')
    await expect(rows.length).toBeGreaterThan(0)
    await expect(rows.length).toBeLessThan(50)
    await expect(canvas.queryByText('Row 500')).not.toBeInTheDocument()
  },
}

/** Scrolling the box swaps which rows are actually in the DOM. */
export const ScrollingRevealsMoreRows: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getByText('Row 1')).toBeInTheDocument())

    const container = canvasElement.querySelector('[role="list"]')!
    container.scrollTop = 5000
    container.dispatchEvent(new Event('scroll'))

    await waitFor(() => expect(canvas.queryByText('Row 1')).not.toBeInTheDocument())
    // Windowing's overscan can land several rows in the "150s" range at once, not just one.
    await waitFor(() => expect(canvas.getAllByText(/Row 15\d/).length).toBeGreaterThan(0))
  },
}

import type { Meta, StoryObj } from '@storybook/vue3-vite'

import SectionLabel from '@/components/typography/SectionLabel.vue'

const meta: Meta<typeof SectionLabel> = {
  title: 'Components/Typography/SectionLabel',
  component: SectionLabel,
}
export default meta

type Story = StoryObj<typeof SectionLabel>

export const Default: Story = {
  render: () => ({
    components: { SectionLabel },
    template: '<SectionLabel>Fleet · 7 ships</SectionLabel>',
  }),
}

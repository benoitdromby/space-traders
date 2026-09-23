import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { http, HttpResponse } from 'msw'

import SplashView from '@/features/auth/views/SplashView.vue'
import { makeMockFleet } from '@/mocks/data'
import { agentErrorHandler, agentHandler, fleetHandlers } from '@/mocks/handlers'

const meta: Meta<typeof SplashView> = {
  title: 'Auth/SplashView',
  component: SplashView,
}
export default meta

type Story = StoryObj<typeof SplashView>

export const Default: Story = {}

/** Entering a valid token connects and moves on to the fleet. */
export const ConnectSuccess: Story = {
  parameters: { msw: [agentHandler(), ...fleetHandlers(makeMockFleet(2))] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.type(canvas.getByLabelText('Your API token'), 'a-valid-token')
    await userEvent.click(canvas.getByRole('button', { name: /Connect/ }))

    // The token field is cleared right away, regardless of outcome — never left sitting in the DOM.
    await waitFor(() => expect(canvas.getByLabelText('Your API token')).toHaveValue(''))
  },
}

export const InvalidToken: Story = {
  parameters: { msw: [agentErrorHandler(401, 'invalid token')] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.type(canvas.getByLabelText('Your API token'), 'a-bad-token')
    await userEvent.click(canvas.getByRole('button', { name: /Connect/ }))

    await expect(
      await canvas.findByText('This token was rejected by the API. Check it and try again.'),
    ).toBeInTheDocument()
  },
}

export const RateLimited: Story = {
  parameters: { msw: [agentErrorHandler(429, 'too many requests')] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.type(canvas.getByLabelText('Your API token'), 'a-token')
    await userEvent.click(canvas.getByRole('button', { name: /Connect/ }))

    await expect(
      await canvas.findByText('Too many requests. Wait a moment and try again.'),
    ).toBeInTheDocument()
  },
}

export const NetworkError: Story = {
  parameters: {
    msw: [http.get('*/my/agent', () => HttpResponse.error())],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.type(canvas.getByLabelText('Your API token'), 'a-token')
    await userEvent.click(canvas.getByRole('button', { name: /Connect/ }))

    await expect(
      await canvas.findByText('Cannot reach the SpaceTraders API. Check your connection.'),
    ).toBeInTheDocument()
  },
}

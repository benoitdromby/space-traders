import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { dismissToast, pushToast, useToasts } from '@/errors/toasts'

describe('toasts', () => {
  beforeEach(() => {
    // The toast list is a module-level singleton: drain it between tests so one doesn't leak
    // into the next.
    const { toasts } = useToasts()
    for (const toast of [...toasts.value]) dismissToast(toast.id)
  })
  afterEach(() => vi.useRealTimers())

  it('queues a toast', () => {
    const { toasts } = useToasts()
    pushToast('Something broke')
    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0]!.message).toBe('Something broke')
  })

  it('gives each toast a distinct id', () => {
    const { toasts } = useToasts()
    pushToast('First')
    pushToast('Second')
    expect(toasts.value[0]!.id).not.toBe(toasts.value[1]!.id)
  })

  it('does not queue a message that is already showing', () => {
    const { toasts } = useToasts()
    pushToast('Something broke')
    pushToast('Something broke')
    expect(toasts.value).toHaveLength(1)
  })

  it('queues the same message again once the first has been dismissed', () => {
    const { toasts } = useToasts()
    pushToast('Something broke')
    dismissToast(toasts.value[0]!.id)
    pushToast('Something broke')
    expect(toasts.value).toHaveLength(1)
  })

  it('dismisses only the toast asked for', () => {
    const { toasts } = useToasts()
    pushToast('First')
    pushToast('Second')
    dismissToast(toasts.value[0]!.id)
    expect(toasts.value.map((t) => t.message)).toEqual(['Second'])
  })

  it('auto-dismisses after a few seconds', () => {
    vi.useFakeTimers()
    const { toasts } = useToasts()
    pushToast('Something broke')
    expect(toasts.value).toHaveLength(1)

    vi.advanceTimersByTime(6_000)

    expect(toasts.value).toHaveLength(0)
  })
})

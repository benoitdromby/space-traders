import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from 'vue'

import { i18n } from '@/i18n'
import { dismissToast, useToasts } from '@/errors/toasts'
import { registerGlobalErrorHandler, reportUnexpectedError } from '@/errors/globalErrorHandler'

// Reused across the two `registerGlobalErrorHandler` tests below, rather than declared inline
// in each: a fresh object literal with a `template` there reads as a second component in this
// file to the one-component-per-file lint rule.
const testAppRoot = { template: '<div />' }

describe('globalErrorHandler', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'en'
    const { toasts } = useToasts()
    for (const toast of [...toasts.value]) dismissToast(toast.id)
  })
  afterEach(() => vi.restoreAllMocks())

  describe('reportUnexpectedError', () => {
    it('shows the generic notice', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      const { toasts } = useToasts()

      reportUnexpectedError(new Error('boom'))

      expect(toasts.value).toHaveLength(1)
      expect(toasts.value[0]!.message).toBe('Something went wrong. Please try again.')
    })

    it('logs the real error, not just the generic notice', () => {
      const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('boom')

      reportUnexpectedError(error, 'some context')

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('some context'), error)
    })
  })

  describe('registerGlobalErrorHandler', () => {
    it('installs a Vue errorHandler that reports through the same path', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      const { toasts } = useToasts()
      const app = createApp(testAppRoot)

      registerGlobalErrorHandler(app)
      app.config.errorHandler?.(new Error('component blew up'), null, 'render function')

      expect(toasts.value).toHaveLength(1)
    })

    it('listens for unhandled promise rejections and reports them the same way', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      const addSpy = vi.spyOn(window, 'addEventListener')
      const { toasts } = useToasts()
      const app = createApp(testAppRoot)

      registerGlobalErrorHandler(app)

      const [, handler] = addSpy.mock.calls.find(([event]) => event === 'unhandledrejection')!
      ;(handler as (event: PromiseRejectionEvent) => void)({
        reason: new Error('rejected'),
      } as PromiseRejectionEvent)

      expect(toasts.value).toHaveLength(1)
    })
  })
})

import type { App } from 'vue'

import { i18n } from '@/i18n'
import { pushToast } from '@/errors/toasts'

/**
 * The last line of defense — not a replacement for any feature's own error handling. Every API
 * call in this app already has its own try/catch with a specific or generic message where that
 * happens (a failed request, bad input: things *expected* to go wrong sometimes). This only
 * fires for whatever slips past all of that: a bug, a genuinely unanticipated exception. It
 * always shows the same generic notice — there is nothing more specific to say about an error
 * nothing recognised.
 */
export function reportUnexpectedError(error: unknown, context?: string): void {
  console.error(context ? `[unhandled — ${context}]` : '[unhandled]', error)
  pushToast(i18n.global.t('common.unexpectedError'))
}

export function registerGlobalErrorHandler(app: App): void {
  app.config.errorHandler = (error, _instance, info) => reportUnexpectedError(error, info)

  window.addEventListener('unhandledrejection', (event) => {
    reportUnexpectedError(event.reason, 'promise rejection')
  })
}

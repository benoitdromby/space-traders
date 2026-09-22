import type { RouteLocationRaw } from 'vue-router'

/**
 * Reasons the generic error page (src/views/ErrorView.vue) can show. Each one needs a matching
 * `error.reasons.<reason>` { heading, message } pair in every locale file; an unrecognised
 * reason (a stale link, a typo) falls back to `error.unknown` instead of breaking.
 *
 * "not-found" is reached through the catch-all route, not a link built with `errorRoute()` — it
 * has no meaningful params to redirect to, only every path nothing else matched.
 */
export const ERROR_REASONS = ['no-ships', 'not-found'] as const
export type ErrorReason = (typeof ERROR_REASONS)[number]

/** Builds a link to the error page for this reason. */
export function errorRoute(reason: ErrorReason): RouteLocationRaw {
  return { name: 'error', params: { reason } }
}

/**
 * Reasons where going back to "/" wouldn't actually help (it would just land right back here —
 * e.g. an agent that still has no ships): the error page skips the "back to home" link for these.
 */
const NO_HOME_LINK: ReadonlySet<ErrorReason> = new Set(['no-ships'])

export function hasHomeLink(reason: string): boolean {
  return !NO_HOME_LINK.has(reason as ErrorReason)
}

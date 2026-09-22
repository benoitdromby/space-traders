/**
 * Optional token for the "Use demo token" button, set in `.env.local` (git-ignored).
 *
 * `import.meta.env.DEV` is a build-time constant, so in production builds this
 * whole expression is dead code and the token is never bundled. vite.config.ts
 * additionally blanks VITE_DEMO_TOKEN when building.
 */
export const DEMO_TOKEN: string | undefined = import.meta.env.DEV
  ? import.meta.env.VITE_DEMO_TOKEN || undefined
  : undefined

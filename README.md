# Space Traders

A frontend for [SpaceTraders](https://spacetraders.io/), a persistent space-trading game
played entirely through a public HTTP API. Built with Vue 3, TypeScript, and Vite as a
self-directed exercise in structuring a real, non-trivial SPA: feature-based folders, business
logic kept out of templates, state management used only where it actually earns its keep, and a
full testing story from unit tests up through Storybook-driven interaction tests against a
mocked API.

[![CI](https://github.com/benoitdromby/space-traders/actions/workflows/ci.yml/badge.svg)](https://github.com/benoitdromby/space-traders/actions/workflows/ci.yml)
[![Deploy](https://github.com/benoitdromby/space-traders/actions/workflows/deploy.yml/badge.svg)](https://github.com/benoitdromby/space-traders/actions/workflows/deploy.yml)

**Live demo:** [benoitdromby.github.io/space-traders](https://benoitdromby.github.io/space-traders/)
— you'll need a free SpaceTraders API token to sign in; get one at
[spacetraders.io](https://spacetraders.io/) (no account required, just a chosen agent symbol and
faction).

For the reasoning behind how this is built — state management, the composable/component split,
the testing strategy, security choices — see **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## What this demonstrates

- **Feature-based structure**, not a type-based one: each feature (`auth`, `fleet`, `location`,
  `market`, `waypoints`) owns its own components, composables, API calls, and types, so changing
  one feature rarely touches another.
- **Business logic separated from templates**: components stay focused on markup; stateful logic
  (travel, docking, flight mode, ship location, market data) lives in composables the components
  just wire up.
- **Pinia used deliberately, not by default**: only the two stores that genuinely need to be
  shared across unrelated components and the router guards (the connected agent, the fleet and
  its selected ship) are stores at all — everything else is local component or composable state.
- **A real error-handling model**: every API call handles its own expected failures (bad token,
  rate limiting, insufficient fuel, …) with a specific message; a global handler catches anything
  that slips past that as a last resort, never leaving the app silently broken.
- **Security-conscious defaults for a browser-only app**: the API token lives in `sessionStorage`
  only (never `localStorage`, a URL, or a log) and falls back to in-memory if storage is
  unavailable; the production build ships a strict Content-Security-Policy.
- **Tests at more than one layer**: fast unit/component tests with Vitest, plus Storybook stories
  that double as living documentation and run as real interaction tests (via a mocked API) in CI.

## Tech stack

| Area                                     | Choice                                                       |
| ---------------------------------------- | ------------------------------------------------------------ |
| Framework                                | Vue 3 (Composition API, `<script setup>`) + TypeScript       |
| Build                                    | Vite                                                         |
| State                                    | Pinia                                                        |
| Routing                                  | Vue Router                                                   |
| i18n                                     | vue-i18n (English/French)                                    |
| Styling                                  | Tailwind CSS                                                 |
| Unit/component testing                   | Vitest + @vue/test-utils                                     |
| Component workshop & interaction testing | Storybook + `msw-storybook-addon` + `@storybook/test-runner` |
| API mocking                              | MSW (Mock Service Worker)                                    |
| Linting/formatting                       | ESLint (flat config) + Prettier                              |

## Getting started

Requires Node 22+ (see `.nvmrc`).

```sh
npm install
npm run dev
```

Open the app and sign in with a SpaceTraders API token (see the live demo note above for where
to get one — the same applies locally). No environment variables are required for local
development; the app talks directly to the public SpaceTraders API from the browser.

Other scripts:

```sh
npm run build          # type-check + production build
npm run lint            # ESLint
npm run format:check    # Prettier, check only
npm test                # Vitest, once
npm run test:watch      # Vitest, watch mode
npm run storybook       # Storybook dev server, http://localhost:6006
npm run test:storybook  # Storybook's interaction tests (needs the dev server running)
```

## Testing

- **`npm test`** — 243 Vitest tests across 31 files: composables, Pinia stores, router guards,
  and components (via `@vue/test-utils`), including regression tests for real bugs found and
  fixed along the way (see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a couple of the more
  interesting ones).
- **`npm run test:storybook`** — 65 interaction tests across 14 Storybook stories, run headlessly
  against a fully mocked API (MSW), covering loading/error/empty states and real user flows
  (selecting a ship, sending it on a trip, opening the market) end to end at the component level.
- CI (`.github/workflows/ci.yml`) runs formatting, linting, type-checking, the full Vitest suite,
  and a production build on every push and pull request.

## Project structure

```text
src/
  api/            shared fetch wrapper, token storage
  components/     generic, feature-agnostic components (icons, layout, overlays, lists, …)
  errors/         global error handler + toast notifications
  features/
    auth/         sign-in, the connected agent
    fleet/        ship list, per-ship actions (dock/orbit/flight mode)
    location/     the selected ship's current system/waypoint
    market/       trade goods at a waypoint
    waypoints/    the system's waypoints, sending a ship to one
    dashboard/    composes the features above into the main screen
  i18n/           vue-i18n setup + locale files
  mocks/          MSW handlers and fixtures, shared by tests and Storybook
  router/         routes and navigation guards
  views/          top-level, non-feature views (splash fallback, generic error page)
```

Each feature under `src/features/` follows the same internal shape where it applies:
`components/`, `composables/`, `stores/`, `api/`, `types/`, `__tests__/`.

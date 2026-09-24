# Architecture

This document explains _why_ the app is structured the way it is, not just what's where. The
README covers the what; this is the reasoning a code review would ask for.

## Overview

It's a single-page app with no backend of its own: it talks directly to the public
[SpaceTraders API](https://docs.spacetraders.io/) from the browser, using a bearer token the
user supplies. There is no server-side code to reason about — every architectural decision here
is about keeping a client-only Vue app maintainable as it grows past a toy size.

## Feature-based folders, not type-based

`src/features/` has one folder per domain concept (`auth`, `fleet`, `location`, `market`,
`waypoints`, `dashboard`), and each one owns its own `components/`, `composables/`, `api/`,
`types/`, and (where it has shared state) `stores/`. The alternative — top-level `components/`,
`composables/`, `stores/` folders holding everything, grouped by _kind_ instead of by _domain_ —
is the more common Vue starter layout, but it stops scaling once a feature has more than a
component or two: finding everything related to "ship travel" means jumping between three or
four unrelated top-level folders instead of one.

`src/components/` still exists, but only for genuinely generic, feature-agnostic pieces (icons,
a modal dialog, pagination controls, a virtualized list) — anything reusable enough that it
doesn't belong to one feature. It's further split into subfolders (`icons/`, `layout/`,
`overlays/`, `lists/`, …) for the same reason: once there were a couple of dozen files flat in
one directory, finding anything meant scanning the whole list. A folder with one file in it is
fine — it costs nothing and leaves room for the next component of that kind without another
reorganization.

## Business logic lives in composables, not components

Early on, a couple of components accumulated real logic alongside their templates —
`WaypointList.vue` had its own `travelTo()`/`distanceTo()` functions, `FleetList.vue` had
`toggleDocking()`/`changeFlightMode()`. Once a component's `<script>` block is doing state
management _and_ the template is doing layout, it's harder to read either one, and the logic is
untestable without mounting the whole component.

Both were extracted into composables (`useShipTravel`, `useFleetActions`, and similarly
`useShipLocation`, `useWaypoints`, `useMarket` for the fetch-driven pieces): plain functions
returning refs and methods, unit-tested directly with no component mounting at all. The
components that use them shrink to wiring — template plus a call to the composable — which is
what makes a component's `<script>` block worth skimming instead of stepping through.

## State management: Pinia only where it earns its keep

There are exactly two Pinia stores — `authStore` (the connected agent) and `fleetStore` (the
ship list and which one is currently selected) — and nothing else. That's a deliberate choice,
not a default: most state in this app (a modal's open/closed flag, a form's pending state, a
composable's own fetch status) is local to the component or composable that needs it, because
nothing else ever needs to read it.

The two stores that exist are stores because they're genuinely shared across unrelated parts of
the tree that have no parent/child relationship to pass props through:

- `fleetStore` is read or written from `SplashView` (loading the fleet right after connecting),
  `DashboardView`, `FleetList`, two different composables (`useFleetActions`,
  `useShipTravel`), and the router's own navigation guard (`router/index.ts`) — which needs to
  select a ship _before_ any component matching the route even exists.
- `authStore` is read from `App.vue`, `SplashView`, `DashboardView`, `ErrorView`, and the same
  router guard, and written to by `fleetStore` itself (it drops the fleet when the session ends).

A router guard reading/writing store state before a component exists is exactly the case prop
drilling can't cover — that's the actual justification for reaching for a store here, rather than
"it holds server data" or "there's more than one piece of state" (weaker reasons that would argue
for turning far more of this app into stores than it needs).

## Routing and the fleet's selected ship

The selected ship is _in the URL_ (`/ship/:symbol`), not just in memory — so it's addressable,
shareable, and survives a reload. `router/index.ts`'s single `beforeEach` guard is what keeps the
URL and `fleetStore.selectedShip` in sync in both directions:

- Landing on `/ship/:symbol` (a click, a pasted link, back/forward) resolves that symbol against
  the fleet, paging through the API if it isn't on the currently loaded page, and falls back to a
  real ship (or the "no ships" error page) instead of a dead end if the symbol doesn't exist.
- A stored session token found in `sessionStorage` on a fresh page load is restored here too,
  before any route is allowed to resolve — this is also what `App.vue`'s loading screen (see
  below) is actually waiting on.
- Landing on `/` while already connected redirects straight to whichever ship is already
  selected, or an error page for the rare agent with none.

This is the _only_ place in the app that redirects on the session ending — an earlier version had
`DashboardView`/`ErrorView` each also calling `router.replace()` themselves as a belt-and-braces
measure, which raced `App.vue`'s own watcher on the same condition and, depending on which
navigation Vue Router cancelled, could leave the page stuck. Centralizing it in `App.vue`'s
watcher removed the second writer instead of trying to coordinate two.

## API layer and error handling

Every request goes through one wrapper (`api/client.ts`): it attaches the bearer token, throws a
typed `ApiError` (with the HTTP status and parsed body) on a non-2xx response, and clears the
stored token automatically on a 401 from an _authenticated_ request (not from a token being
validated for the first time — that's a rejected login attempt, not an expired session).

Error handling itself is two-tier:

1. **Feature-level.** Every place a request can fail in an expected way — a bad token, rate
   limiting, a network error, insufficient fuel for a trip — catches it and shows a specific
   message next to whatever the user was doing. This is most of the error handling in the app,
   and it's what the Storybook stories for error states exercise.
2. **Global, last resort.** `errors/globalErrorHandler.ts` registers a Vue `app.config.errorHandler`
   and a `window.unhandledrejection` listener that push a single generic toast
   (`errors/toasts.ts` + `ToastHost.vue`) for whatever wasn't already handled — a real bug, not
   an anticipated failure. It's deliberately generic: by definition, nothing more specific was
   known about an error that reached it.

## Security notes

Two choices worth calling out, since it's easy to get both wrong in a browser-only app with no
backend to hide anything behind:

- **The API token lives in `sessionStorage` only** (`api/authToken.ts`) — never `localStorage`,
  never a URL, never logged — so it survives a reload but is gone when the tab closes, and falls
  back to an in-memory variable if storage itself is unavailable (private browsing, blocked
  cookies) rather than failing outright.
- **The production build adds a Content-Security-Policy** (`vite.config.ts`) scoped to the
  configured API origin, so that even if a script were ever injected, it couldn't send the token
  anywhere else. It's applied at build time only — the dev server needs inline scripts and a
  websocket for HMR that the policy would otherwise block.

## Internationalization

`vue-i18n` with two locales (English, French — `src/i18n/locales/*.json`). The browser's own
language is deliberately ignored in favor of a locale the user picked explicitly (persisted in
`localStorage`, distinct from the token's `sessionStorage`): a browser's reported language isn't
reliably the language someone wants an app in.

## Testing strategy

Two layers, doing different jobs rather than duplicating each other:

- **Vitest** (243 tests across 31 files) for anything that benefits from being tested in
  isolation and fast: composables, the two Pinia stores, router guards, utility functions, and
  components via `@vue/test-utils` where mounting is the most direct way to verify behavior. This
  is where regressions get pinned down precisely — e.g. a test asserting the router guard is the
  _only_ thing that navigates on disconnect, after a real bug where two independent navigations
  to the same target raced each other.
- **Storybook + MSW + `@storybook/test-runner`** (65 interaction tests across 14 stories) for
  component behavior against a realistic, fully mocked API — loading/empty/error states, and full
  interaction flows (selecting a ship, sending it on a trip, opening the market) run against mock
  handlers in `src/mocks/`, shared between Storybook and, where useful, the tests above. This
  layer exists for two reasons at once: it's a real regression suite (`npm run test:storybook`
  runs every story's interaction test headlessly, and CI could gate on it the same way it gates
  on Vitest), and every story doubles as living documentation of what each component looks like
  in each state — something a unit test alone doesn't give you.

### A couple of bugs this layer actually caught

Worth mentioning because they're the kind of bug that's easy to wave away as "just flaky tests"
if you're not careful, but that isn't what either of these were:

- **Storybook's Vue3 renderer keeps one Pinia instance (and, since it was created outside
  `setup()`, one Vue Router instance) alive across story switches**, rather than giving each
  story a genuinely fresh one the way `setActivePinia(createPinia())` does between Vitest tests.
  A ship selected via a router-guard navigation in one story could resolve _later_, against
  whatever story happened to be active by the time that navigation's guard actually ran,
  aborting that later story's own unrelated fetch. Fixed by building the router fresh inside
  `setup()` (matching how the Pinia instance is already constructed fresh there) instead of once
  at module scope.
- **A full-screen loading state that briefly showed the splash page again mid-connect.**
  `App.vue` swapped a loading screen for the router view based on `auth.connecting`, which
  flipped back to `false` as soon as the agent fetch resolved — but the connect flow still had a
  fleet fetch and a navigation left to do, and until that navigation landed, the router view was
  still showing the splash route. Fixed by scoping the connect flow's own pending state to the
  splash page itself (disabling its form, not swapping the whole screen) and changing `App.vue`'s
  loading gate to `router.isReady()`, which only ever covers the one moment that genuinely has
  nothing else to show: the very first paint, before the router's initial navigation (including
  restoring a stored session) has resolved.

## Deployment

`.github/workflows/ci.yml` runs formatting, linting, type-checking, the full Vitest suite, and a
production build on every push and pull request. `.github/workflows/deploy.yml` builds and
publishes to GitHub Pages on every push to `main` — the app needs no server and no secrets to
deploy, since the token is supplied by whoever's using it, not baked into the build.

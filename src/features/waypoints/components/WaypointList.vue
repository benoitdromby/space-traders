<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useI18n } from 'vue-i18n'

import SectionLabel from '@/components/typography/SectionLabel.vue'
import TravelIcon from '@/components/icons/TravelIcon.vue'
import VirtualList from '@/components/lists/VirtualList.vue'
import type { Ship } from '@/features/fleet/types/ship'
import { useShipTravel } from '@/features/waypoints/composables/useShipTravel'
import { useWaypoints } from '@/features/waypoints/composables/useWaypoints'
import type { WaypointSummary } from '@/features/waypoints/types/waypoint'
import { distanceBetween } from '@/utils/distance'
import { humanize } from '@/utils/humanize'

const props = defineProps<{
  ship: Ship | null
  /** Whether the fleet has finished its first load: tells "still waiting for a ship" from "there is none". */
  fleetLoaded: boolean
}>()

const { t } = useI18n()
const shipRef = toRef(props, 'ship')

const {
  waypoints,
  total,
  loaded,
  loadError,
  moreError,
  loadingMore,
  loadNextPage,
  retry,
  originCoordinates,
} = useWaypoints(shipRef)

const { travelPending, travelError, travelFailed, travelTo } = useShipTravel(shipRef)

// Null whenever there's no fixed point to measure from yet (no ship, still loading, or
// mid-transit — see `originCoordinates` for why).
function distanceTo(item: WaypointSummary): number | null {
  return originCoordinates.value ? distanceBetween(item, originCoordinates.value) : null
}

// True before the fleet has loaded at all, and while this system's first page is being fetched.
const loading = computed(
  () => !props.fleetLoaded || (props.ship !== null && !loaded.value && !loadError.value),
)

const ROW_HEIGHT = 50

// The ship itself is the source of truth for "currently travelling" — not just right after this
// panel sends it somewhere, but also if it was already IN_TRANSIT when the page loaded.
const traveling = computed(() => props.ship?.nav.status === 'IN_TRANSIT')

// `nav.waypointSymbol` becomes the *destination* the instant a trip starts, well before the ship
// has actually arrived — so it's only "here" once the ship isn't mid-transit. While travelling,
// no waypoint is "here": the destination just looks like any other reachable one (its travel icon
// disabled, same as every other row, since the ship isn't in orbit to send anywhere).
const currentWaypointSymbol = computed(() =>
  props.ship && props.ship.nav.status !== 'IN_TRANSIT' ? props.ship.nav.waypointSymbol : null,
)
</script>

<template>
  <section aria-labelledby="waypoints-heading">
    <SectionLabel id="waypoints-heading">{{ t('waypoints.title') }}</SectionLabel>

    <div v-if="loading" aria-hidden="true" class="flex flex-col gap-1.5">
      <div
        v-for="n in 4"
        :key="n"
        class="flex h-12.5 items-center gap-2 rounded-md border border-line bg-void px-3"
      >
        <div class="skeleton h-3 w-28" />
        <div class="skeleton ml-auto h-3 w-3 shrink-0 rounded-full" />
      </div>
    </div>

    <div
      v-else-if="loadError"
      role="alert"
      class="flex flex-col items-center gap-2 rounded-lg border border-line bg-surface p-4 text-center"
    >
      <p class="text-danger">{{ t('waypoints.error') }}</p>
      <button
        type="button"
        class="cursor-pointer rounded-md border border-line px-3 py-1 font-mono text-xs text-ink transition-colors hover:border-line-hi hover:text-ink-hi focus-visible:outline-2 focus-visible:outline-accent"
        @click="retry"
      >
        {{ t('common.retry') }}
      </button>
    </div>

    <p
      v-else-if="!ship"
      class="rounded-lg border border-line bg-surface p-4 text-center text-ink-dim"
    >
      {{ t('location.noShip') }}
    </p>

    <p
      v-else-if="total === 0"
      class="rounded-lg border border-line bg-surface p-4 text-center text-ink-dim"
    >
      {{ t('waypoints.empty') }}
    </p>

    <div v-else class="flex flex-col gap-1.5">
      <div
        v-if="traveling"
        class="flex items-center gap-2 rounded-md border border-gold/30 bg-gold/10 px-3 py-2 text-[11px] text-gold"
      >
        <span class="relative flex size-2 shrink-0">
          <span
            class="absolute inline-flex h-full w-full rounded-full bg-gold opacity-75 motion-safe:animate-ping"
          />
          <span class="relative inline-flex size-2 rounded-full bg-gold" />
        </span>
        {{ t('waypoints.traveling', { waypoint: ship?.nav.waypointSymbol }) }}
      </div>

      <div
        v-else-if="travelError"
        role="alert"
        class="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[11px] text-danger"
      >
        {{
          t('waypoints.insufficientFuel', {
            waypoint: travelError.waypoint,
            required: travelError.fuelRequired,
            available: travelError.fuelAvailable,
          })
        }}
      </div>

      <p v-else-if="travelFailed" role="alert" class="text-[10px] text-danger">
        {{ t('waypoints.travelError') }}
      </p>

      <VirtualList
        :items="waypoints"
        :row-height="ROW_HEIGHT"
        :max-height="320"
        class="rounded-md border border-line"
        @reach-end="loadNextPage"
      >
        <template #row="{ item }">
          <div
            class="flex h-full items-center gap-2 border-b border-line/50 px-3 last:border-b-0"
            :class="item.symbol === currentWaypointSymbol ? 'bg-accent/10' : 'bg-void'"
          >
            <span class="min-w-0 flex-1">
              <span class="block truncate font-mono text-[11px] font-bold text-ink-hi">
                {{ item.symbol }}
              </span>
              <span class="block truncate text-[10px] text-ink-dim">
                {{ humanize(item.type)
                }}<template v-if="item.faction"> · {{ item.faction }}</template>
              </span>
            </span>
            <span
              v-if="distanceTo(item) !== null"
              class="shrink-0 font-mono text-[10px] text-ink-dim tabular-nums"
            >
              {{ t('waypoints.distance') }} {{ distanceTo(item) }}
            </span>
            <span
              v-if="item.symbol === currentWaypointSymbol"
              class="shrink-0 rounded-[3px] bg-ok/15 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.04em] text-ok uppercase"
            >
              {{ t('waypoints.here') }}
            </span>
            <button
              v-else
              type="button"
              :disabled="travelPending || ship?.nav.status !== 'IN_ORBIT'"
              :title="
                ship?.nav.status === 'IN_ORBIT'
                  ? t('waypoints.travelTo', { waypoint: item.symbol })
                  : t('waypoints.travelRequiresOrbit')
              "
              class="flex shrink-0 cursor-pointer items-center justify-center rounded-[4px] border border-line-hi/60 p-1 text-ink-dim transition-colors hover:not-disabled:border-accent-dim hover:not-disabled:text-accent disabled:cursor-default disabled:opacity-40"
              @click="travelTo(item.symbol)"
            >
              <TravelIcon class="size-3.5" />
              <span class="sr-only">{{ t('waypoints.travelTo', { waypoint: item.symbol }) }}</span>
            </button>
          </div>
        </template>
      </VirtualList>

      <div v-if="loadingMore" aria-hidden="true" class="flex flex-col gap-1.5">
        <div
          v-for="n in 2"
          :key="n"
          class="flex h-12.5 items-center gap-2 rounded-md border border-line bg-void px-3"
        >
          <div class="skeleton h-3 w-28" />
        </div>
      </div>

      <p v-if="moreError" role="alert" class="px-1 py-1 text-[10px] text-danger">
        {{ t('waypoints.moreError') }}
        <button type="button" class="ml-1 cursor-pointer underline" @click="retry">
          {{ t('common.retry') }}
        </button>
      </p>
    </div>
  </section>
</template>

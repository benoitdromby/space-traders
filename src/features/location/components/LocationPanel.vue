<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useI18n } from 'vue-i18n'

import MarketplaceIcon from '@/components/MarketplaceIcon.vue'
import SectionLabel from '@/components/SectionLabel.vue'
import type { Ship } from '@/features/fleet/types/ship'
import { useShipLocation } from '@/features/location/composables/useShipLocation'
import LocationField from '@/features/location/components/LocationField.vue'
import { humanize } from '@/utils/humanize'

const props = defineProps<{
  ship: Ship | null
  /** Whether the fleet has finished its first load: tells "still waiting for a ship" from "there is none". */
  fleetLoaded: boolean
}>()

const { t } = useI18n()
const { system, waypoint, status, retry } = useShipLocation(toRef(props, 'ship'))

// True before the fleet has loaded at all, and while this ship's system/waypoint are being fetched.
const loading = computed(() => !props.fleetLoaded || status.value === 'loading')

const location = computed(() => {
  if (!system.value || !waypoint.value) return null
  return { system: system.value, waypoint: waypoint.value }
})
</script>

<template>
  <section aria-labelledby="location-heading">
    <SectionLabel id="location-heading">{{ t('location.title') }}</SectionLabel>

    <!--
      min-h matches the loaded content's own height (~347px stacked on narrow screens, ~193px
      side by side from sm: up) so switching ships doesn't jump the page while this panel
      flashes through its loading/error states in between.
    -->
    <div
      class="flex min-h-87 flex-col overflow-hidden rounded-lg border border-line bg-surface sm:min-h-49"
    >
      <!--
        flex-1: stretches whichever state is showing to fill the reserved min-h (a plain h-full
        doesn't reliably do this against a min-height-only parent, since the parent's height is
        then "indefinite" for percentage resolution; flex sizing doesn't have that problem).
        content-center then centers the skeleton's rows as a block in that space, rather than
        pinning them to the top with empty space below.
      -->
      <div
        v-if="loading"
        aria-hidden="true"
        class="grid flex-1 grid-cols-1 content-center divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0"
      >
        <div v-for="col in 2" :key="col" class="flex flex-col gap-2.5 p-4">
          <div class="skeleton h-2 w-20" />
          <div class="skeleton h-3.5 w-28" />
          <div class="skeleton h-2.5 w-24" />
          <div class="skeleton h-2.5 w-32" />
        </div>
      </div>

      <div
        v-else-if="status === 'error'"
        role="alert"
        class="flex flex-1 flex-col items-center justify-center gap-3 p-5 text-center"
      >
        <p class="text-danger">{{ t('location.error') }}</p>
        <button
          type="button"
          class="cursor-pointer rounded-md border border-line px-3 py-1 font-mono text-xs text-ink transition-colors hover:border-line-hi hover:text-ink-hi focus-visible:outline-2 focus-visible:outline-accent"
          @click="retry"
        >
          {{ t('common.retry') }}
        </button>
      </div>

      <div
        v-else-if="!ship"
        class="flex flex-1 items-center justify-center p-5 text-center text-ink-dim"
      >
        {{ t('location.noShip') }}
      </div>

      <div
        v-else-if="location"
        class="grid flex-1 grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0"
      >
        <div class="flex flex-col gap-1 p-4">
          <p class="mb-1 font-mono text-[9px] tracking-[0.14em] text-ink-dim uppercase">
            {{ t('location.system') }}
          </p>
          <p class="mb-0.5 font-mono text-[15px] font-bold text-accent">
            {{ location.system.symbol }}
          </p>
          <LocationField :label="t('location.type')">{{
            humanize(location.system.type)
          }}</LocationField>
          <LocationField :label="t('location.coordinates')">
            {{ location.system.x }}, {{ location.system.y }}
          </LocationField>
          <LocationField :label="t('location.waypoints')">
            {{ location.system.waypointCount }}
          </LocationField>
        </div>

        <div class="flex flex-col gap-1 p-4">
          <p class="mb-1 font-mono text-[9px] tracking-[0.14em] text-ink-dim uppercase">
            {{ t('location.waypoint') }}
          </p>
          <p class="mb-0.5 flex items-center gap-1.5">
            <span class="font-mono text-[15px] font-bold text-accent">
              {{ location.waypoint.symbol }}
            </span>
            <!-- The icon itself is decorative (aria-hidden); this span carries its accessible name. -->
            <span
              v-if="location.waypoint.hasMarketplace"
              :title="t('location.marketplace')"
              class="inline-flex shrink-0 items-center"
            >
              <MarketplaceIcon class="size-3.5 text-accent" />
              <span class="sr-only">{{ t('location.marketplace') }}</span>
            </span>
          </p>
          <LocationField :label="t('location.type')">{{
            humanize(location.waypoint.type)
          }}</LocationField>
          <LocationField :label="t('location.faction')">{{
            location.waypoint.faction ?? '—'
          }}</LocationField>
        </div>
      </div>
    </div>
  </section>
</template>

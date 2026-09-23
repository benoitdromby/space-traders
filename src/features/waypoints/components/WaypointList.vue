<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useI18n } from 'vue-i18n'

import MarketplaceIcon from '@/components/MarketplaceIcon.vue'
import SectionLabel from '@/components/SectionLabel.vue'
import VirtualList from '@/components/VirtualList.vue'
import type { Ship } from '@/features/fleet/types/ship'
import { useWaypoints } from '@/features/waypoints/composables/useWaypoints'
import { humanize } from '@/utils/humanize'

const props = defineProps<{
  ship: Ship | null
  /** Whether the fleet has finished its first load: tells "still waiting for a ship" from "there is none". */
  fleetLoaded: boolean
}>()

const { t } = useI18n()

const { waypoints, total, loaded, loadError, moreError, loadingMore, loadNextPage, retry } =
  useWaypoints(toRef(props, 'ship'))

// True before the fleet has loaded at all, and while this system's first page is being fetched.
const loading = computed(
  () => !props.fleetLoaded || (props.ship !== null && !loaded.value && !loadError.value),
)

const ROW_HEIGHT = 50
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
            :class="item.symbol === ship?.nav.waypointSymbol ? 'bg-accent/10' : 'bg-void'"
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
            <span v-if="item.hasMarketplace" class="inline-flex shrink-0 items-center">
              <MarketplaceIcon class="size-3.5 text-accent" />
              <span class="sr-only">{{ t('location.marketplace') }}</span>
            </span>
            <span
              v-if="item.symbol === ship?.nav.waypointSymbol"
              class="shrink-0 rounded-[3px] bg-ok/15 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.04em] text-ok uppercase"
            >
              {{ t('waypoints.here') }}
            </span>
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

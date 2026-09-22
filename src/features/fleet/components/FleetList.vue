<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import PaginationControls from '@/components/PaginationControls.vue'
import SectionLabel from '@/components/SectionLabel.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'

import { PAGE_SIZE, useFleetStore } from '@/features/fleet/stores/fleetStore'
import ShipCard from '@/features/fleet/components/ShipCard.vue'

const { t } = useI18n()
const router = useRouter()
const fleet = useFleetStore()

// Also true just before the first request starts, so an unloaded fleet never reads as empty.
const loading = computed(
  () => fleet.status === 'loading' || (!fleet.loaded && fleet.status !== 'error'),
)

// The URL is the source of truth for the selected ship: the router guard is what actually
// updates the store, so a click here just navigates and lets it do that (same as a pasted
// link or the back/forward buttons would).
function selectShip(symbol: string) {
  void router.push({ name: 'ship', params: { symbol } })
}
</script>

<template>
  <section aria-labelledby="fleet-heading">
    <SectionLabel id="fleet-heading">
      {{ t('fleet.title') }}
      <template v-if="fleet.loaded"> · {{ t('fleet.count', fleet.total) }} </template>
    </SectionLabel>

    <div v-if="fleet.status === 'error'" role="alert" class="py-4 text-center">
      <p class="text-danger">{{ t('fleet.error') }}</p>
      <button
        type="button"
        class="mt-3 cursor-pointer rounded-md border border-line px-3 py-1 font-mono text-xs text-ink transition-colors hover:border-line-hi hover:text-ink-hi focus-visible:outline-2 focus-visible:outline-accent"
        @click="fleet.load()"
      >
        {{ t('common.retry') }}
      </button>
    </div>

    <p
      v-else-if="fleet.loaded && !loading && fleet.total === 0"
      class="py-4 text-center text-ink-dim"
    >
      {{ t('fleet.empty') }}
    </p>

    <template v-else>
      <ul class="flex flex-col gap-1.5" :aria-busy="loading">
        <template v-if="loading">
          <!-- min-h matches the height of a ShipCard so nothing jumps when the ships arrive. -->
          <SkeletonCard v-for="n in PAGE_SIZE" :key="n" class="min-h-35.5" />
        </template>
        <template v-else>
          <ShipCard
            v-for="ship in fleet.ships"
            :key="ship.symbol"
            :ship="ship"
            :selected="ship.symbol === fleet.selectedSymbol"
            @select="selectShip"
          />
        </template>
      </ul>

      <PaginationControls
        v-if="fleet.showPagination"
        :page="fleet.page"
        :total-pages="fleet.totalPages"
        :disabled="loading"
        @change="fleet.load"
      />
    </template>
  </section>
</template>

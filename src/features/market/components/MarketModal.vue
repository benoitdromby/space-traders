<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import CloseIcon from '@/components/CloseIcon.vue'
import ModalDialog from '@/components/ModalDialog.vue'
import { useMarket } from '@/features/market/composables/useMarket'
import type { MarketGoodType } from '@/features/market/types/market'

const props = defineProps<{
  open: boolean
  /** Both null while there's nothing to show yet — closed, or the ship has no fixed location. */
  systemSymbol: string | null
  waypointSymbol: string | null
}>()
const emit = defineEmits<{ close: [] }>()

const { t, locale } = useI18n()

// Only fetch while actually open: closing clears these to null, which the composable treats as
// "nothing to show" — so re-opening later always asks for fresh prices rather than reusing
// whatever was last loaded.
const { goods, status, retry } = useMarket(
  computed(() => (props.open ? props.systemSymbol : null)),
  computed(() => (props.open ? props.waypointSymbol : null)),
)

// EXCHANGE (generally just fuel) isn't grouped under its own heading — every market carries it
// as a utility, not a trade opportunity, so it reads better listed plainly up top. Imports and
// exports are the goods actually worth comparing, so those get labelled sections.
const SECTIONS: { type: MarketGoodType; labelKey: string | null }[] = [
  { type: 'EXCHANGE', labelKey: null },
  { type: 'IMPORT', labelKey: 'market.imports' },
  { type: 'EXPORT', labelKey: 'market.exports' },
]

const sections = computed(() =>
  SECTIONS.map((section) => ({
    ...section,
    goods: goods.value.filter((good) => good.type === section.type),
  })).filter((section) => section.goods.length > 0),
)

const formatPrice = computed(() => {
  const formatter = new Intl.NumberFormat(locale.value)
  return (price: number) => formatter.format(price)
})
</script>

<template>
  <ModalDialog :open="open" labelledby="market-heading" @close="emit('close')">
    <div class="flex items-center justify-between border-b border-line px-4 py-3">
      <h2 id="market-heading" class="font-mono text-[13px] font-bold text-ink-hi">
        {{ t('market.title') }}
      </h2>
      <button
        type="button"
        :aria-label="t('common.close')"
        class="cursor-pointer rounded-md p-1 text-ink-dim transition-colors hover:text-ink-hi focus-visible:outline-2 focus-visible:outline-accent"
        @click="emit('close')"
      >
        <CloseIcon class="size-4" />
      </button>
    </div>

    <div class="max-h-[60vh] overflow-y-auto p-4">
      <div v-if="status === 'loading'" aria-hidden="true" class="flex flex-col gap-2">
        <div v-for="n in 5" :key="n" class="skeleton h-5" />
      </div>

      <div
        v-else-if="status === 'error'"
        role="alert"
        class="flex flex-col items-center gap-2 py-4 text-center"
      >
        <p class="text-danger">{{ t('market.error') }}</p>
        <button
          type="button"
          class="cursor-pointer rounded-md border border-line px-3 py-1 font-mono text-xs text-ink transition-colors hover:border-line-hi hover:text-ink-hi focus-visible:outline-2 focus-visible:outline-accent"
          @click="retry"
        >
          {{ t('common.retry') }}
        </button>
      </div>

      <p v-else-if="goods.length === 0" class="py-4 text-center text-ink-dim">
        {{ t('market.empty') }}
      </p>

      <table v-else class="w-full border-collapse">
        <thead>
          <tr class="border-b border-line text-[10px] tracking-[0.06em] text-ink-dim uppercase">
            <th scope="col" class="pb-2 text-left font-normal">{{ t('market.itemColumn') }}</th>
            <th scope="col" class="pb-2 text-right font-normal">{{ t('market.buy') }}</th>
            <th scope="col" class="pb-2 text-right font-normal">{{ t('market.sell') }}</th>
          </tr>
        </thead>
        <tbody v-for="section in sections" :key="section.type">
          <tr v-if="section.labelKey">
            <th
              scope="colgroup"
              colspan="3"
              class="pt-3 pb-1 text-left font-mono text-[9px] tracking-[0.1em] text-ink-dim uppercase"
            >
              {{ t(section.labelKey) }}
            </th>
          </tr>
          <tr v-for="good in section.goods" :key="good.symbol" class="border-b border-line/50">
            <td class="py-2 font-mono text-[11px] font-bold text-ink-hi">{{ good.symbol }}</td>
            <td class="py-2 text-right font-mono text-[11px] text-ink tabular-nums">
              ${{ formatPrice(good.purchasePrice) }}
            </td>
            <td class="py-2 text-right font-mono text-[11px] text-ink tabular-nums">
              ${{ formatPrice(good.sellPrice) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </ModalDialog>
</template>

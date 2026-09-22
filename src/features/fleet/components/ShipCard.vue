<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { Ship, ShipStatus } from '@/features/fleet/types/ship'
import ShipFrameIcon from '@/features/fleet/components/ShipFrameIcon.vue'
import StatBar from '@/features/fleet/components/StatBar.vue'

const props = defineProps<{ ship: Ship; selected: boolean }>()
const emit = defineEmits<{ select: [symbol: string] }>()

const { t, te } = useI18n()

const STATUS_STYLES: Record<ShipStatus, string> = {
  DOCKED: 'bg-ok/15 text-ok',
  IN_ORBIT: 'bg-accent/15 text-accent',
  IN_TRANSIT: 'bg-gold/15 text-gold',
}

const statusLabel = computed(() => {
  const key = `fleet.status.${props.ship.nav.status}`
  return te(key) ? t(key) : props.ship.nav.status
})
</script>

<template>
  <li>
    <button
      type="button"
      :aria-pressed="selected"
      class="relative block w-full cursor-pointer rounded-lg border px-3.5 py-3 text-left transition-colors hover:border-line-hi hover:bg-hover focus-visible:outline-2 focus-visible:outline-accent"
      :class="
        selected
          ? 'border-accent bg-raised shadow-[0_0_0_1px_var(--color-accent-dim),inset_0_0_24px_rgba(56,189,248,0.15)]'
          : 'border-line bg-surface'
      "
      @click="emit('select', ship.symbol)"
    >
      <span
        v-if="selected"
        class="absolute top-2 bottom-2 left-0 w-0.75 rounded-xs bg-accent"
        aria-hidden="true"
      />

      <span class="mb-2.5 flex items-center gap-2.5">
        <ShipFrameIcon
          :frame="ship.frame.symbol"
          class="size-8 shrink-0"
          :class="selected ? 'text-accent' : 'text-ink-dim'"
        />
        <span class="min-w-0 flex-1">
          <span class="block truncate font-mono text-[13px] font-bold text-ink-hi">
            {{ ship.symbol }}
          </span>
          <span class="mt-px block truncate text-[10px] tracking-[0.06em] text-ink-dim uppercase">
            {{ ship.frame.name }}
          </span>
        </span>
        <span class="flex shrink-0 gap-1.5 font-mono text-[9px] font-bold tracking-[0.06em]">
          <span
            class="rounded-[3px] px-1.5 py-0.5 uppercase"
            :class="STATUS_STYLES[ship.nav.status]"
          >
            {{ statusLabel }}
          </span>
          <span class="rounded-[3px] border border-line bg-void px-1.5 py-0.5 text-ink-dim">
            {{ ship.nav.flightMode }}
          </span>
        </span>
      </span>

      <span class="grid grid-cols-2 gap-2">
        <span class="flex min-w-0 flex-col gap-1">
          <span class="text-[10px] tracking-[0.06em] text-ink-dim uppercase">
            {{ t('fleet.location') }}
          </span>
          <span class="truncate font-mono text-[11px]" :title="ship.nav.waypointSymbol">
            {{ ship.nav.waypointSymbol }}
          </span>
        </span>
        <span class="flex flex-col gap-1.5">
          <StatBar
            :label="t('fleet.cargo')"
            :value="ship.cargo.units"
            :max="ship.cargo.capacity"
            tone="cargo"
          />
          <StatBar
            :label="t('fleet.fuel')"
            :value="ship.fuel.current"
            :max="ship.fuel.capacity"
            tone="fuel"
          />
        </span>
      </span>
    </button>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { Ship, ShipStatus } from '@/features/fleet/types/ship'
import ShipFrameIcon from '@/features/fleet/components/ShipFrameIcon.vue'
import StatBar from '@/features/fleet/components/StatBar.vue'

const props = defineProps<{
  ship: Ship
  selected: boolean
  /** A dock/orbit request for this ship is in flight. */
  toggling: boolean
  /** The message from this ship's last failed dock/orbit request, if any. */
  toggleError: string | null
}>()
const emit = defineEmits<{ select: [symbol: string]; 'toggle-docking': [symbol: string] }>()

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

// Docking/orbiting only makes sense at a waypoint: a ship en route has nowhere to send that
// request until it arrives.
const canToggleDocking = computed(() => props.ship.nav.status !== 'IN_TRANSIT')
const toggleLabel = computed(() =>
  t(props.ship.nav.status === 'DOCKED' ? 'fleet.actions.enterOrbit' : 'fleet.actions.dock'),
)
</script>

<template>
  <li
    class="relative overflow-hidden rounded-lg border transition-colors"
    :class="
      selected
        ? 'border-accent bg-raised shadow-[0_0_0_1px_var(--color-accent-dim),inset_0_0_24px_rgba(56,189,248,0.15)]'
        : 'border-line bg-surface hover:border-line-hi hover:bg-hover'
    "
  >
    <span
      v-if="selected"
      class="absolute top-2 bottom-2 left-0 w-0.75 rounded-xs bg-accent"
      aria-hidden="true"
    />

    <button
      type="button"
      :aria-pressed="selected"
      class="block w-full cursor-pointer px-3.5 py-3 text-left focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent"
      @click="emit('select', ship.symbol)"
    >
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

    <div
      v-if="canToggleDocking"
      class="flex items-center justify-end gap-2 border-t border-line px-3.5 py-2"
    >
      <p v-if="toggleError" role="alert" class="mr-auto text-[10px] text-danger">
        {{ toggleError }}
      </p>
      <button
        type="button"
        :disabled="toggling"
        class="cursor-pointer rounded-[4px] border px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.06em] uppercase transition-colors disabled:cursor-default disabled:opacity-50"
        :class="
          ship.nav.status === 'DOCKED'
            ? 'border-accent-dim bg-accent/10 text-accent hover:not-disabled:bg-accent/20'
            : 'border-ok/30 bg-ok/10 text-ok hover:not-disabled:bg-ok/20'
        "
        @click="emit('toggle-docking', ship.symbol)"
      >
        {{ toggling ? t('fleet.actions.pending') : toggleLabel }}
      </button>
    </div>
  </li>
</template>

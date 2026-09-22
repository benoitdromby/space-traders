<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  label: string
  value: number
  max: number
  tone: 'fuel' | 'cargo'
}>()

// Some ships have no fuel tank or cargo hold (capacity 0): there is no percentage to show.
const percent = computed(() =>
  props.max > 0 ? Math.min(100, Math.round((props.value / props.max) * 100)) : null,
)
</script>

<template>
  <span class="block">
    <span class="mb-0.5 block text-[10px] tracking-[0.06em] text-ink-dim uppercase">
      {{ label }}
    </span>
    <span class="flex items-center gap-1.5">
      <span
        role="progressbar"
        :aria-label="label"
        aria-valuemin="0"
        :aria-valuemax="max"
        :aria-valuenow="value"
        class="h-1 flex-1 overflow-hidden rounded-xs bg-void"
      >
        <span
          class="block h-full rounded-xs"
          :class="tone === 'fuel' ? 'bg-accent' : 'bg-gold'"
          :style="{ width: `${percent ?? 0}%` }"
        />
      </span>
      <span class="min-w-6.5 text-right font-mono text-[10px] text-ink-dim tabular-nums">
        {{ percent === null ? '—' : `${percent}%` }}
      </span>
    </span>
  </span>
</template>

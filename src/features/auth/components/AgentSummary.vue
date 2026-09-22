<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { Agent } from '@/features/auth/types'

const props = defineProps<{ agent: Agent }>()

const { t, locale } = useI18n()

const fields = computed(() => [
  { key: 'symbol', label: t('agent.symbol'), value: props.agent.symbol },
  { key: 'headquarters', label: t('agent.headquarters'), value: props.agent.headquarters },
  {
    key: 'credits',
    label: t('agent.credits'),
    value: `${props.agent.credits.toLocaleString(locale.value)} ₡`,
  },
  { key: 'faction', label: t('agent.faction'), value: props.agent.startingFaction },
])
</script>

<template>
  <dl
    class="flex flex-wrap overflow-hidden rounded-md border border-line bg-raised font-mono text-[11px]"
  >
    <div
      v-for="field in fields"
      :key="field.key"
      class="flex flex-col border-r border-line px-2.5 py-1 last:border-r-0 sm:px-3 sm:py-1.5"
    >
      <dt class="mb-px text-[8px] leading-tight tracking-[0.12em] text-ink-dim uppercase">
        {{ field.label }}
      </dt>
      <dd
        class="leading-snug whitespace-nowrap"
        :class="{
          'text-accent': field.key === 'symbol',
          'text-gold': field.key === 'credits',
          'text-ink-hi': field.key !== 'symbol' && field.key !== 'credits',
        }"
      >
        <span
          v-if="field.key === 'symbol'"
          class="mr-1.5 inline-block size-[5px] rounded-full bg-ok align-middle shadow-[0_0_5px_var(--color-ok)]"
          aria-hidden="true"
        />{{ field.value }}
      </dd>
    </div>
  </dl>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { SUPPORTED_LOCALES, setLocale, type SupportedLocale } from '@/i18n'

const { t, locale } = useI18n()

function onChange(event: Event) {
  setLocale((event.target as HTMLSelectElement).value as SupportedLocale)
}
</script>

<template>
  <label class="flex items-center gap-2 text-xs text-ink-dim">
    <span class="sr-only sm:not-sr-only">{{ t('language.label') }}</span>
    <select
      :value="locale"
      class="cursor-pointer rounded-md border border-line bg-raised px-2 py-1 font-mono text-xs text-ink-hi outline-none focus:border-accent"
      @change="onChange"
    >
      <option v-for="code in SUPPORTED_LOCALES" :key="code" :value="code">
        {{ t(`language.${code}`) }}
      </option>
    </select>
  </label>
</template>

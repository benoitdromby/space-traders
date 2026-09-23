<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div
    role="status"
    aria-live="polite"
    class="relative z-10 flex min-h-screen flex-col items-center justify-center gap-6"
  >
    <div
      class="size-14 animate-spin rounded-full border-2 border-line border-t-accent motion-reduce:animate-none"
    />
    <div class="text-center">
      <p class="font-mono text-xs tracking-[0.06em] text-accent uppercase">
        {{ t('loading.authenticating') }}
      </p>
      <p class="mt-1.5 font-mono text-[11px] tracking-[0.12em] text-ink-dim">
        {{ t('loading.contacting') }}
      </p>
    </div>
  </div>
</template>

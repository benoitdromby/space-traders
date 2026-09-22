<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <section class="relative z-10 flex min-h-screen flex-col items-center justify-center gap-2 px-4">
    <h1 class="text-3xl font-semibold text-ink-hi">{{ t('notFound.heading') }}</h1>
    <p>{{ t('notFound.message') }}</p>
    <RouterLink to="/" class="mt-3 text-accent hover:underline">
      {{ t('notFound.backHome') }}
    </RouterLink>
  </section>
</template>

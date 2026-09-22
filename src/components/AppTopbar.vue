<script setup lang="ts">
import BrandName from './BrandName.vue'
import LanguageSwitcher from './LanguageSwitcher.vue'
</script>

<template>
  <header
    class="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-3.5 py-2.5 sm:px-5"
  >
    <BrandName class="shrink-0 text-xs" />
    <slot />
    <div class="flex items-center gap-2">
      <LanguageSwitcher />
      <slot name="actions" />
    </div>
  </header>
</template>

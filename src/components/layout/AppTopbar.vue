<script setup lang="ts">
import BrandName from '@/components/brand/BrandName.vue'
import LanguageSwitcher from '@/components/controls/LanguageSwitcher.vue'
</script>

<template>
  <!--
    Below sm: the same wrapping flex row as always (narrow screens have no room to spare for
    true centering, and wrapping is what keeps this usable there).
    From sm: up, a 3-column grid instead: with the brand and the actions group so often differing
    in width, `justify-between`'s equal *gaps* don't put the middle slot on the actual centre of
    the row — a grid's outer columns absorb that difference so the centre column always lands
    exactly in the middle, in line with the `max-w-175 mx-auto` content column below it (which,
    being centred on the same full-width page, shares the same centre point).
  -->
  <header
    class="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-3.5 py-2.5 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:flex-nowrap sm:px-5"
  >
    <BrandName class="shrink-0 text-xs sm:justify-self-start" />
    <div class="sm:justify-self-center">
      <slot />
    </div>
    <div class="flex items-center gap-2 sm:justify-self-end">
      <LanguageSwitcher />
      <slot name="actions" />
    </div>
  </header>
</template>

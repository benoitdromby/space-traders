<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <!--
    Label above value, not side by side: a side-by-side layout with a fixed label width breaks
    once the label is translated to a language whose word for it doesn't fit that width (e.g.
    French "Coordonnées", "Particularités" overflow into the value next to them). Stacking avoids
    depending on how long any given language's label happens to be.
  -->
  <p class="flex flex-col gap-0.5">
    <span class="text-[10px] tracking-[0.04em] text-ink-dim uppercase">{{ label }}</span>
    <span class="font-mono text-[11px] text-ink-hi"><slot /></span>
  </p>
</template>

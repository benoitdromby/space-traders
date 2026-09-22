<script setup lang="ts">
import { computed } from 'vue'

type Shape = [tag: 'path' | 'circle' | 'line' | 'rect', attrs: Record<string, string | number>]

const thin = { 'stroke-width': 1 }
const vertical = (x: number, y1: number, y2: number): Shape => [
  'line',
  { x1: x, y1, x2: x, y2, ...thin },
]

const ICONS: Record<string, Shape[]> = {
  FRAME_PROBE: [
    ['circle', { cx: 16, cy: 16, r: 5 }],
    ['line', { x1: 16, y1: 4, x2: 16, y2: 11 }],
    ['line', { x1: 16, y1: 21, x2: 16, y2: 28 }],
    ['line', { x1: 4, y1: 16, x2: 11, y2: 16 }],
    ['line', { x1: 21, y1: 16, x2: 28, y2: 16 }],
  ],
  FRAME_SHUTTLE: [
    ['path', { d: 'M16 4 C16 4 8 10 8 20 L16 28 L24 20 C24 10 16 4 16 4Z' }],
    ['line', { x1: 8, y1: 20, x2: 4, y2: 24 }],
    ['line', { x1: 24, y1: 20, x2: 28, y2: 24 }],
  ],
  FRAME_MINER: [
    ['rect', { x: 10, y: 8, width: 12, height: 16, rx: 2 }],
    ['path', { d: 'M10 14 L4 12 L4 20 L10 18' }],
    ['path', { d: 'M22 14 L28 12 L28 20 L22 18' }],
    ['circle', { cx: 16, cy: 16, r: 3 }],
  ],
  FRAME_EXPLORER: [
    ['path', { d: 'M16 4 L20 14 L28 14 L22 20 L24 28 L16 23 L8 28 L10 20 L4 14 L12 14 Z' }],
  ],
  FRAME_FRIGATE: [
    ['path', { d: 'M16 3 L26 12 L26 22 L16 29 L6 22 L6 12 Z' }],
    ['path', { d: 'M16 3 L16 29', ...thin }],
    ['line', { x1: 6, y1: 17, x2: 26, y2: 17, ...thin }],
    ['circle', { cx: 16, cy: 14, r: 3 }],
  ],
  FRAME_LIGHT_FREIGHTER: [
    ['rect', { x: 6, y: 10, width: 20, height: 12, rx: 2 }],
    ['path', { d: 'M6 13 L3 16 L6 19' }],
    ['path', { d: 'M26 13 L29 16 L26 19' }],
    ...[11, 16, 21].map((x) => vertical(x, 10, 22)),
  ],
  FRAME_HEAVY_FREIGHTER: [
    ['rect', { x: 4, y: 9, width: 24, height: 14, rx: 2 }],
    ['path', { d: 'M4 12 L1 16 L4 20' }],
    ['path', { d: 'M28 12 L31 16 L28 20' }],
    ...[10, 16, 22].map((x) => vertical(x, 9, 23)),
    ['rect', { x: 7, y: 6, width: 18, height: 3, rx: 1 }],
  ],
  FRAME_DESTROYER: [
    ['path', { d: 'M16 4 L28 12 L28 24 L16 28 L4 24 L4 12 Z' }],
    ['circle', { cx: 16, cy: 16, r: 4 }],
    ['line', { x1: 4, y1: 12, x2: 28, y2: 12, ...thin }],
    ['line', { x1: 4, y1: 24, x2: 28, y2: 24, ...thin }],
  ],
  FRAME_CARRIER: [
    ['rect', { x: 2, y: 12, width: 28, height: 8, rx: 2 }],
    ['rect', { x: 6, y: 8, width: 20, height: 4 }],
    ['path', { d: 'M2 16 L0 14 L0 18 L2 16' }],
    ['path', { d: 'M30 16 L32 14 L32 18 L30 16' }],
    ...[10, 16, 22].map((x) => vertical(x, 8, 12)),
  ],
}

const FALLBACK: Shape[] = [
  ['path', { d: 'M16 4 L22 14 L16 28 L10 14 Z' }],
  ['path', { d: 'M10 14 L4 18 L10 20' }],
  ['path', { d: 'M22 14 L28 18 L22 20' }],
]

const props = defineProps<{ frame: string }>()

const shapes = computed(() => ICONS[props.frame] ?? FALLBACK)
</script>

<template>
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
    <component :is="tag" v-for="([tag, attrs], i) in shapes" :key="i" v-bind="attrs" />
  </svg>
</template>

<script setup lang="ts" generic="T">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { computeVisibleRange } from '@/utils/virtualRange'

const props = withDefaults(
  defineProps<{
    items: T[]
    /** Fixed height of every row, in pixels — required for the offset math to work. */
    rowHeight: number
    /** Extra rows rendered past each edge of the viewport, to avoid a flash of empty space. */
    overscan?: number
    /** How tall the scrolling box itself is, in pixels. */
    maxHeight?: number
    /** Fires once the user has scrolled within this many pixels of the bottom of what's loaded. */
    reachEndThreshold?: number
  }>(),
  { overscan: 3, maxHeight: 320, reachEndThreshold: 200 },
)

const emit = defineEmits<{ reachEnd: [] }>()

defineSlots<{
  row(props: { item: T; index: number }): unknown
}>()

const container = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const containerHeight = ref(0)

let resizeObserver: ResizeObserver | null = null

/** Re-reads the container's measured height. Exposed so tests (jsdom reports 0) can force it. */
function measure() {
  containerHeight.value = container.value?.clientHeight ?? 0
  maybeReachEnd()
}

defineExpose({ measure })

onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined' && container.value) {
    resizeObserver = new ResizeObserver(() => measure())
    resizeObserver.observe(container.value)
  }
})
onBeforeUnmount(() => resizeObserver?.disconnect())

function onScroll() {
  if (!container.value) return
  scrollTop.value = container.value.scrollTop
  maybeReachEnd()
}

function maybeReachEnd() {
  if (containerHeight.value <= 0) return
  const distanceToBottom = totalHeight.value - (scrollTop.value + containerHeight.value)
  if (distanceToBottom <= props.reachEndThreshold) emit('reachEnd')
}

// New rows can arrive (loadNextPage resolving) without the container ever firing another scroll
// event — e.g. the box wasn't full yet, or the user is already parked at the bottom.
watch(
  () => props.items.length,
  () => maybeReachEnd(),
)

const range = computed(() =>
  computeVisibleRange(
    scrollTop.value,
    containerHeight.value,
    props.rowHeight,
    props.items.length,
    props.overscan,
  ),
)

const visibleRows = computed(() =>
  props.items
    .slice(range.value.start, range.value.end)
    .map((item, i) => ({ item, index: range.value.start + i })),
)

const totalHeight = computed(() => props.items.length * props.rowHeight)
</script>

<template>
  <div
    ref="container"
    role="list"
    class="overflow-y-auto"
    :style="{ maxHeight: `${maxHeight}px` }"
    @scroll="onScroll"
  >
    <div class="relative" :style="{ height: `${totalHeight}px` }">
      <div
        v-for="row in visibleRows"
        :key="row.index"
        role="listitem"
        class="absolute inset-x-0"
        :style="{ transform: `translateY(${row.index * rowHeight}px)`, height: `${rowHeight}px` }"
      >
        <slot name="row" :item="row.item" :index="row.index" />
      </div>
    </div>
  </div>
</template>

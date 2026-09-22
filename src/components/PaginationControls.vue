<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  page: number
  totalPages: number
  disabled?: boolean
}>()

const emit = defineEmits<{ change: [page: number] }>()

const { t } = useI18n()

const atStart = computed(() => props.disabled || props.page <= 1)
const atEnd = computed(() => props.disabled || props.page >= props.totalPages)

const buttons = computed(() => [
  { label: t('pagination.first'), text: '«', target: 1, off: atStart.value },
  { label: t('pagination.previous'), text: '‹', target: props.page - 1, off: atStart.value },
  { label: t('pagination.next'), text: '›', target: props.page + 1, off: atEnd.value },
  { label: t('pagination.last'), text: '»', target: props.totalPages, off: atEnd.value },
])
</script>

<template>
  <nav :aria-label="t('pagination.label')" class="flex items-center justify-center gap-1 pt-2.5">
    <template v-for="(button, index) in buttons" :key="button.label">
      <span
        v-if="index === 2"
        class="min-w-15 px-2 text-center font-mono text-[11px] text-ink-dim tabular-nums"
        aria-live="polite"
      >
        {{ t('pagination.page') }} <span class="text-ink-hi">{{ page }}</span> / {{ totalPages }}
      </span>
      <button
        type="button"
        :aria-label="button.label"
        :title="button.label"
        :disabled="button.off"
        class="flex size-7 cursor-pointer items-center justify-center rounded-[5px] border border-line text-[11px] text-ink-dim transition-colors hover:not-disabled:border-line-hi hover:not-disabled:text-ink-hi focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-30"
        @click="emit('change', button.target)"
      >
        {{ button.text }}
      </button>
    </template>
  </nav>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import CloseIcon from '@/components/icons/CloseIcon.vue'
import { dismissToast, useToasts } from '@/errors/toasts'

const { t } = useI18n()
const { toasts } = useToasts()
</script>

<template>
  <!--
    pointer-events-none on the wrapper, pointer-events-auto on each toast: the empty space this
    stack occupies (most of it, usually) must not block clicks on whatever's underneath.
  -->
  <div
    class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
  >
    <TransitionGroup
      enter-active-class="motion-safe:transition motion-safe:duration-200 motion-safe:ease-out"
      enter-from-class="motion-safe:opacity-0 motion-safe:translate-y-2"
      leave-active-class="motion-safe:transition motion-safe:duration-150 motion-safe:ease-in"
      leave-to-class="motion-safe:opacity-0"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        role="alert"
        class="pointer-events-auto flex max-w-sm items-center gap-3 rounded-lg border border-danger/30 bg-surface px-4 py-2.5 text-[12px] text-ink-hi shadow-2xl"
      >
        <span>{{ toast.message }}</span>
        <button
          type="button"
          :aria-label="t('common.close')"
          class="shrink-0 cursor-pointer text-ink-dim transition-colors hover:text-ink-hi focus-visible:outline-2 focus-visible:outline-accent"
          @click="dismissToast(toast.id)"
        >
          <CloseIcon class="size-3.5" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

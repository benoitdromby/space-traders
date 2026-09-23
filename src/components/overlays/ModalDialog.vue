<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

/**
 * A generic centred dialog, built on the native <dialog> element rather than a hand-rolled one:
 * that gets focus trapping, Escape-to-close, and a proper accessibility tree for free. Content
 * is entirely up to the caller via the default slot (its own header, close button, body, ...).
 */
const props = defineProps<{
  open: boolean
  /** id of the element (inside the slot) that names this dialog, for aria-labelledby. */
  labelledby: string
}>()
const emit = defineEmits<{ close: [] }>()

const dialog = ref<HTMLDialogElement | null>(null)

function sync(open: boolean) {
  if (!dialog.value) return
  if (open && !dialog.value.open) dialog.value.showModal()
  else if (!open && dialog.value.open) dialog.value.close()
}

watch(() => props.open, sync)
onMounted(() => sync(props.open))

// The native element already closes itself on Escape — this just tells the caller so its own
// `open` state doesn't drift from what's actually on screen.
function onNativeClose() {
  emit('close')
}

// A click that lands on the <dialog> element itself (not on anything inside it) is a click on
// the backdrop area, since the dialog's box only covers its actual content.
function onBackdropClick(event: MouseEvent) {
  if (event.target === dialog.value) emit('close')
}
</script>

<template>
  <dialog
    ref="dialog"
    :aria-labelledby="labelledby"
    class="fixed top-1/2 left-1/2 m-0 max-h-[85vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-void/70 backdrop:backdrop-blur-sm"
    @close="onNativeClose"
    @click="onBackdropClick"
  >
    <slot />
  </dialog>
</template>

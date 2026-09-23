import { ref } from 'vue'

export interface Toast {
  id: number
  message: string
}

// Long enough to read, short enough not to pile up if several unrelated things go wrong close
// together.
const TOAST_DURATION_MS = 6000

const toasts = ref<Toast[]>([])
let nextId = 0

/**
 * Queues a generic notice, auto-dismissed after a few seconds (or sooner, if the user closes it
 * themselves). A message already showing isn't queued again — this exists for genuinely
 * unexpected failures, and a recurring one shouldn't be able to flood the screen with duplicates
 * of the same notice.
 */
export function pushToast(message: string): void {
  if (toasts.value.some((toast) => toast.message === message)) return
  const id = ++nextId
  toasts.value.push({ id, message })
  setTimeout(() => dismissToast(id), TOAST_DURATION_MS)
}

export function dismissToast(id: number): void {
  toasts.value = toasts.value.filter((toast) => toast.id !== id)
}

export function useToasts() {
  return { toasts }
}

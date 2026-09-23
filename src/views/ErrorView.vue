<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'

import AppTopbar from '@/components/layout/AppTopbar.vue'
import AgentSummary from '@/features/auth/components/AgentSummary.vue'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { hasHomeLink } from '@/router/errorReasons'

// A plain prop, not read from the route: this page is reached two different ways (a specific
// "/error/:reason" link, and the catch-all for anything else, fixed to "not-found"), and doesn't
// need to care which.
const props = defineProps<{ reason: string }>()

const { t, te } = useI18n()
const auth = useAuthStore()

// An unrecognised reason (a stale link, a typo) gets the generic message instead of a blank key.
const content = computed(() => {
  const key = `error.reasons.${props.reason}`
  const base = te(`${key}.heading`) ? key : 'error.unknown'
  return { heading: t(`${base}.heading`), message: t(`${base}.message`) }
})
const showHomeLink = computed(() => hasHomeLink(props.reason))

// Just the state change — App.vue's own watcher on `auth.isConnected` is what navigates back to
// the splash page. See DashboardView.vue's disconnect() for why this doesn't also call
// router.replace() itself.
function disconnect() {
  auth.disconnect()
}
</script>

<template>
  <div class="relative z-10 flex min-h-screen flex-col">
    <AppTopbar>
      <AgentSummary v-if="auth.agent" :agent="auth.agent" />
      <template #actions>
        <button
          v-if="auth.agent"
          type="button"
          class="cursor-pointer rounded-md border border-line px-2.5 py-1 font-mono text-xs text-ink transition-colors hover:border-danger hover:text-danger focus-visible:outline-2 focus-visible:outline-accent"
          @click="disconnect"
        >
          {{ t('auth.disconnect') }}
        </button>
      </template>
    </AppTopbar>

    <main
      class="mx-auto flex w-full max-w-125 flex-1 flex-col items-center justify-center gap-2 px-4 text-center"
    >
      <h1 class="text-xl font-semibold text-ink-hi">{{ content.heading }}</h1>
      <p class="text-ink">{{ content.message }}</p>
      <RouterLink v-if="showHomeLink" to="/" class="mt-3 text-accent hover:underline">
        {{ t('error.backHome') }}
      </RouterLink>
    </main>
  </div>
</template>

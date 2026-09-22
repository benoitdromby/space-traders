<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import AppTopbar from '@/components/AppTopbar.vue'
import AgentSummary from '@/features/auth/components/AgentSummary.vue'
import { useAuthStore } from '@/features/auth/authStore'
import FleetList from '@/features/fleet/components/FleetList.vue'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

async function disconnect() {
  auth.disconnect()
  await router.replace({ name: 'splash' })
}
</script>

<template>
  <div class="relative z-10 flex min-h-screen flex-col">
    <AppTopbar>
      <AgentSummary v-if="auth.agent" :agent="auth.agent" />
      <template #actions>
        <button
          type="button"
          class="cursor-pointer rounded-md border border-line px-2.5 py-1 font-mono text-xs text-ink transition-colors hover:border-danger hover:text-danger focus-visible:outline-2 focus-visible:outline-accent"
          @click="disconnect"
        >
          {{ t('auth.disconnect') }}
        </button>
      </template>
    </AppTopbar>

    <main class="mx-auto flex w-full max-w-175 flex-1 flex-col gap-4 p-5">
      <FleetList />
    </main>
  </div>
</template>

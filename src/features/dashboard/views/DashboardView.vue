<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import AppTopbar from '@/components/layout/AppTopbar.vue'
import AgentSummary from '@/features/auth/components/AgentSummary.vue'
import { useAuthStore } from '@/features/auth/stores/authStore'
import FleetList from '@/features/fleet/components/FleetList.vue'
import { useFleetStore } from '@/features/fleet/stores/fleetStore'
import LocationPanel from '@/features/location/components/LocationPanel.vue'
import WaypointList from '@/features/waypoints/components/WaypointList.vue'

const { t } = useI18n()
const auth = useAuthStore()
const fleet = useFleetStore()

// Just the state change — App.vue's own watcher on `auth.isConnected` is what navigates back to
// the splash page. Calling router.replace() here too used to race that watcher: two concurrent
// navigations to the same target, with Vue Router silently cancelling whichever lost, sometimes
// leaving neither one actually complete.
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
          type="button"
          class="cursor-pointer rounded-md border border-line px-2.5 py-1 font-mono text-xs text-ink transition-colors hover:border-danger hover:text-danger focus-visible:outline-2 focus-visible:outline-accent"
          @click="disconnect"
        >
          {{ t('auth.disconnect') }}
        </button>
      </template>
    </AppTopbar>

    <main class="mx-auto flex w-full max-w-175 flex-1 flex-col gap-4 p-5">
      <LocationPanel :ship="fleet.selectedShip" :fleet-loaded="fleet.loaded" />
      <FleetList />
      <WaypointList :ship="fleet.selectedShip" :fleet-loaded="fleet.loaded" />
    </main>
  </div>
</template>

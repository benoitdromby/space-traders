<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterView, useRouter } from 'vue-router'

import LoadingScreen from '@/components/loading/LoadingScreen.vue'
import StarField from '@/components/effects/StarField.vue'
import ToastHost from '@/errors/components/ToastHost.vue'
import { useAuthStore } from '@/features/auth/stores/authStore'

const auth = useAuthStore()
const router = useRouter()

// If the session ends anywhere (e.g. the API rejects the token), go back to the splash page.
watch(
  () => auth.isConnected,
  (connected) => {
    if (!connected && router.currentRoute.value.meta.requiresAuth) {
      void router.replace({ name: 'splash' })
    }
  },
)

// Covers only the very first paint: the router's first navigation (which, for a stored token,
// includes `auth.restore()` plus loading the fleet) resolves before anything else has ever been
// shown, so there'd otherwise be a blank screen rather than nothing to fall back to. Once that's
// resolved, this never shows again — later loading (reconnecting on the splash page, the
// dashboard's own fetches) has its own local, page-level indicator instead, so it doesn't flash
// this full-screen one over whatever the user is already looking at.
const initialNavigationReady = ref(false)
void router.isReady().then(() => {
  initialNavigationReady.value = true
})
</script>

<template>
  <StarField />
  <LoadingScreen v-if="!initialNavigationReady" />
  <RouterView v-else />
  <ToastHost />
</template>

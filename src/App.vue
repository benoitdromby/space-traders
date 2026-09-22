<script setup lang="ts">
import { watch } from 'vue'
import { RouterView, useRouter } from 'vue-router'

import LoadingScreen from '@/components/LoadingScreen.vue'
import StarField from '@/components/StarField.vue'
import { useAuthStore } from '@/features/auth/authStore'

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
</script>

<template>
  <StarField />
  <LoadingScreen v-if="auth.connecting" />
  <RouterView v-else />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import LanguageSwitcher from '@/components/controls/LanguageSwitcher.vue'
import LogoMark from '@/components/brand/LogoMark.vue'
import BrandName from '@/components/brand/BrandName.vue'

import TokenForm from '@/features/auth/components/TokenForm.vue'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { useFleetStore } from '@/features/fleet/stores/fleetStore'
import { errorRoute } from '@/router/errorReasons'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const fleet = useFleetStore()

// Spans the whole flow, not just `auth.connect()`'s own request: `auth.connecting` alone used
// to flip back to false as soon as the agent fetch resolved, well before the fleet load and
// navigation below finished, which briefly showed this page again mid-connect (App.vue's own
// full-screen loading state had already handed back to the router by then). Kept local to this
// page so it drives TokenForm's own pending state instead.
const connecting = ref(false)

async function connect(token: string) {
  connecting.value = true
  try {
    if (!(await auth.connect(token))) return
    // Almost always a ship to land on: a fresh SpaceTraders agent starts with one. The rare
    // exception (an agent with none) gets an explicit page instead of being stuck here silently.
    await fleet.load(1)
    const symbol = fleet.selectedShip?.symbol
    await router.push(symbol ? { name: 'ship', params: { symbol } } : errorRoute('no-ships'))
  } finally {
    connecting.value = false
  }
}
</script>

<template>
  <div class="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
    <section
      class="w-full max-w-105 rounded-xl border border-line-hi bg-surface px-5 py-7 shadow-[0_0_60px_rgba(56,189,248,0.07),0_24px_48px_rgba(0,0,0,0.5)] sm:px-9 sm:py-10"
    >
      <div class="mb-7 flex items-center gap-2.5">
        <LogoMark />
        <h1 class="text-[15px]"><BrandName /></h1>
      </div>

      <h2 class="mb-1.5 text-[22px] font-semibold text-ink-hi">{{ t('splash.title') }}</h2>
      <p class="mb-7 text-[13px] leading-relaxed">{{ t('splash.subtitle') }}</p>

      <TokenForm :error-code="auth.error" :connecting="connecting" @connect="connect" />

      <div class="mt-6 flex justify-end border-t border-line pt-4">
        <LanguageSwitcher />
      </div>
    </section>
  </div>
</template>

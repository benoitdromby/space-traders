<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import LogoMark from '@/components/LogoMark.vue'
import BrandName from '@/components/BrandName.vue'

import TokenForm from '../components/TokenForm.vue'
import { DEMO_TOKEN } from '../demoToken'
import { useAuthStore } from '../authStore'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

async function connect(token: string) {
  if (await auth.connect(token)) await router.push({ name: 'dashboard' })
}

function connectWithDemo() {
  if (DEMO_TOKEN) void connect(DEMO_TOKEN)
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

      <TokenForm
        :error-code="auth.error"
        :demo-available="DEMO_TOKEN !== undefined"
        @connect="connect"
        @demo="connectWithDemo"
      />

      <div class="mt-6 flex justify-end border-t border-line pt-4">
        <LanguageSwitcher />
      </div>
    </section>
  </div>
</template>

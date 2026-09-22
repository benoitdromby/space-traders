<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import type { AuthErrorCode } from '@/features/auth/types'

defineProps<{
  errorCode: AuthErrorCode | null
  demoAvailable: boolean
}>()

const emit = defineEmits<{
  connect: [token: string]
  demo: []
}>()

const { t } = useI18n()
const token = ref('')

function submit() {
  const value = token.value.trim()
  if (!value) return
  // Don't leave the secret sitting in the DOM once it has been handed over.
  token.value = ''
  emit('connect', value)
}
</script>

<template>
  <div>
    <button
      v-if="demoAvailable"
      type="button"
      class="mb-5 block w-full cursor-pointer rounded-md border border-line bg-raised px-4 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:border-line-hi hover:text-ink-hi focus-visible:outline-2 focus-visible:outline-accent"
      @click="emit('demo')"
    >
      ▶ {{ t('splash.demo') }}
    </button>

    <div
      v-if="demoAvailable"
      class="mb-5 flex items-center gap-3 font-mono text-[10px] tracking-[0.1em] text-ink-dim uppercase before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line"
    >
      {{ t('splash.or') }}
    </div>

    <form novalidate @submit.prevent="submit">
      <label
        for="token-input"
        class="mb-1.5 block text-[11px] font-medium tracking-[0.08em] text-ink-dim uppercase"
      >
        {{ t('splash.tokenLabel') }}
      </label>
      <!-- type=password: masks the secret on screen; autocomplete off + ignore flags keep password managers from storing it. -->
      <input
        id="token-input"
        v-model="token"
        type="password"
        name="api-token"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        data-1p-ignore
        data-lpignore="true"
        :placeholder="t('splash.tokenPlaceholder')"
        :aria-invalid="errorCode !== null"
        :aria-describedby="errorCode ? 'token-error' : 'token-hint'"
        class="w-full rounded-md border bg-void px-3 py-2.5 font-mono text-xs text-ink-hi outline-none placeholder:text-ink-dim focus:border-accent focus:ring-2 focus:ring-accent/15"
        :class="errorCode ? 'border-danger' : 'border-line'"
      />

      <p v-if="errorCode" id="token-error" role="alert" class="mt-2 text-xs text-danger">
        {{ t(`auth.errors.${errorCode}`) }}
      </p>
      <p v-else id="token-hint" class="mt-2 text-xs text-ink-dim">{{ t('splash.tokenHint') }}</p>

      <button
        type="submit"
        :disabled="!token.trim()"
        class="mt-4 block w-full cursor-pointer rounded-md bg-accent px-4 py-2.5 text-[13px] font-semibold text-[#040810] transition-colors hover:bg-[#7dd3fa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-accent"
      >
        {{ t('splash.connect') }} →
      </button>
    </form>
  </div>
</template>

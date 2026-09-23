<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import type { AuthErrorCode } from '@/features/auth/types/agent'

const props = defineProps<{
  errorCode: AuthErrorCode | null
  /** True for the whole connect flow (agent fetch, initial fleet load, and navigating away) —
   * not just tied to the API call, so the button stays disabled right up until the dashboard
   * actually takes over. Keeps this page itself as the "connecting" indicator, instead of the
   * app swapping to a full-screen one for a moment before landing back here. */
  connecting: boolean
}>()

const emit = defineEmits<{
  connect: [token: string]
}>()

const { t } = useI18n()
const token = ref('')

function submit() {
  if (props.connecting) return
  const value = token.value.trim()
  if (!value) return
  // Don't leave the secret sitting in the DOM once it has been handed over.
  token.value = ''
  emit('connect', value)
}
</script>

<template>
  <div>
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
        :disabled="connecting"
        :aria-invalid="errorCode !== null"
        :aria-describedby="errorCode ? 'token-error' : 'token-hint'"
        class="w-full rounded-md border bg-void px-3 py-2.5 font-mono text-xs text-ink-hi outline-none placeholder:text-ink-dim focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:opacity-60"
        :class="errorCode ? 'border-danger' : 'border-line'"
      />

      <p v-if="errorCode" id="token-error" role="alert" class="mt-2 text-xs text-danger">
        {{ t(`auth.errors.${errorCode}`) }}
      </p>
      <p v-else id="token-hint" class="mt-2 text-xs text-ink-dim">{{ t('splash.tokenHint') }}</p>

      <button
        type="submit"
        :disabled="connecting || !token.trim()"
        :aria-busy="connecting"
        class="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-[13px] font-semibold text-[#040810] transition-colors hover:bg-[#7dd3fa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-accent"
      >
        <span
          v-if="connecting"
          class="size-3.5 shrink-0 animate-spin rounded-full border-2 border-[#040810]/30 border-t-[#040810] motion-reduce:animate-none"
        />
        {{ connecting ? t('splash.connecting') : `${t('splash.connect')} →` }}
      </button>
    </form>
  </div>
</template>

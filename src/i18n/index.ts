import { createI18n } from 'vue-i18n'

import en from './locales/en.json'
import fr from './locales/fr.json'

export const SUPPORTED_LOCALES = ['en', 'fr'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

const DEFAULT_LOCALE: SupportedLocale = 'en'
const STORAGE_KEY = 'locale'

function isSupported(value: unknown): value is SupportedLocale {
  return SUPPORTED_LOCALES.includes(value as SupportedLocale)
}

/** The language the user picked before, otherwise English (the browser language is ignored). */
function initialLocale(): SupportedLocale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isSupported(saved)) return saved
  } catch {
    // Storage can be unavailable (private mode, blocked cookies): fall through.
  }
  return DEFAULT_LOCALE
}

export const i18n = createI18n({
  legacy: false, // Composition API mode
  locale: initialLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages: { en, fr },
})

document.documentElement.lang = i18n.global.locale.value

export function setLocale(locale: SupportedLocale): void {
  i18n.global.locale.value = locale
  document.documentElement.lang = locale
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Non-critical: the choice just won't persist.
  }
}

import en from './locales/en'
import fr from './locales/fr'
import ru from './locales/ru'
import meow from './locales/meow'

type Locale = 'en' | 'fr' | 'ru' | 'meow'

const locales = {
  en,
  fr,
  ru,
  meow,
}

type TranslationKeys = typeof en

let currentLocale: Locale = 'en'
const STORAGE_KEY = 'vscode-clone.locale'

function loadLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && stored in locales) {
      return stored as Locale
    }
  } catch {
    // Ignore errors
  }
  return 'en'
}

function saveLocale(locale: Locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Ignore errors
  }
}

export function setLocale(locale: Locale) {
  currentLocale = locale
  saveLocale(locale)
  window.dispatchEvent(new CustomEvent('locale-change', { detail: locale }))
}

export function getLocale(): Locale {
  return currentLocale
}

export function t(key: string, params?: Record<string, string>): string {
  const keys = key.split('.')
  let value: any = locales[currentLocale]

  for (const k of keys) {
    value = value?.[k]
  }

  if (typeof value !== 'string') {
    return key
  }

  if (params) {
    return Object.entries(params).reduce((str, [param, replacement]) => {
      return str.replace(new RegExp(`\\{${param}\\}`, 'g'), replacement)
    }, value)
  }

  return value
}

export function useI18n() {
  return {
    t,
    setLocale,
    getLocale,
  }
}

// Initialize locale on load
currentLocale = loadLocale()

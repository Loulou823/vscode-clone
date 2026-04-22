<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { Settings, Search, Palette, Keyboard, FileCode, KeyRound, Globe } from 'lucide-vue-next'
import { useI18n, setLocale } from '../i18n'

const emit = defineEmits<{
  'update:theme': [theme: string]
}>()

const { t } = useI18n()

const searchQuery = ref('')
const activeSection = ref('general')
const currentLocale = ref('en')

const settings = ref({
  theme: 'dark',
  fontSize: 14,
  tabSize: 2,
  wordWrap: 'on',
  minimap: true,
  lineNumbers: 'on',
  autoSave: 'afterDelay',
  formatOnSave: true,
})

const languages = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'ru', label: 'Русский' },
  { value: 'meow', label: 'Meow' },
]

const apiKeys = ref({
  gemini: '',
  chatgpt: '',
  claude: '',
  mistral: '',
})

const loadingKeys = ref(false)

async function loadApiKeys() {
  loadingKeys.value = true
  try {
    const result = await window.apiKeys.get()
    if (result.success && result.keys) {
      apiKeys.value = result.keys
    }
  } catch (err) {
    console.error('Failed to load API keys:', err)
  } finally {
    loadingKeys.value = false
  }
}

function handleLocaleChange(locale: string) {
  setLocale(locale as 'en' | 'fr' | 'ru' | 'meow')
  currentLocale.value = locale
  window.location.reload()
}

onMounted(() => {
  loadApiKeys()
  const { getLocale } = useI18n()
  currentLocale.value = getLocale()
})

watch(() => settings.value.theme, (newTheme) => {
  emit('update:theme', newTheme)
  document.documentElement.setAttribute('data-theme', newTheme)
})
</script>

<template>
  <section class="sidebar settings-pane">
    <div class="sidebar-header">
      <h3>{{ t('settings.title') }}</h3>
    </div>
    <div class="search-input-row">
      <Search :size="16" class="search-icon" />
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        :placeholder="t('settings.searchPlaceholder')"
        spellcheck="false"
      />
    </div>
    <div class="settings-sidebar">
      <button class="settings-nav-item" :class="{ active: activeSection === 'general' }" @click="activeSection = 'general'">
        <Settings :size="16" />
        <span>{{ t('settings.general') }}</span>
      </button>
      <button class="settings-nav-item" :class="{ active: activeSection === 'appearance' }" @click="activeSection = 'appearance'">
        <Palette :size="16" />
        <span>{{ t('settings.appearance') }}</span>
      </button>
      <button class="settings-nav-item" :class="{ active: activeSection === 'editor' }" @click="activeSection = 'editor'">
        <FileCode :size="16" />
        <span>{{ t('settings.editor') }}</span>
      </button>
      <button class="settings-nav-item" :class="{ active: activeSection === 'api-keys' }" @click="activeSection = 'api-keys'">
        <KeyRound :size="16" />
        <span>{{ t('settings.apiKeys') }}</span>
      </button>
      <button class="settings-nav-item" :class="{ active: activeSection === 'keyboard' }" @click="activeSection = 'keyboard'">
        <Keyboard :size="16" />
        <span>{{ t('settings.keyboard') }}</span>
      </button>
    </div>
    <div class="settings-content">
      <div class="settings-group" v-if="activeSection === 'general'">
        <h4>{{ t('settings.general') }}</h4>
        <div class="setting-item">
          <label>{{ t('settings.language') }}</label>
          <select v-model="currentLocale" @change="(e: Event) => handleLocaleChange((e.target as HTMLSelectElement).value)">
            <option v-for="lang in languages" :key="lang.value" :value="lang.value">{{ lang.label }}</option>
          </select>
        </div>
        <div class="setting-item">
          <label>{{ t('settings.autoSave') }}</label>
          <select v-model="settings.autoSave">
            <option value="off">{{ t('settings.autoSaveOff') }}</option>
            <option value="afterDelay">{{ t('settings.autoSaveAfterDelay') }}</option>
            <option value="onFocusChange">{{ t('settings.autoSaveOnFocusChange') }}</option>
          </select>
        </div>
      </div>
      <div class="settings-group" v-if="activeSection === 'appearance'">
        <h4>{{ t('settings.appearance') }}</h4>
        <div class="setting-item">
          <label>{{ t('settings.theme') }}</label>
          <select v-model="settings.theme">
            <option value="dark">{{ t('settings.themeDark') }}</option>
            <option value="light">{{ t('settings.themeLight') }}</option>
            <option value="hc">{{ t('settings.themeHighContrast') }}</option>
          </select>
        </div>
      </div>
      <div class="settings-group" v-if="activeSection === 'editor'">
        <h4>{{ t('settings.editor') }}</h4>
        <div class="setting-item">
          <label>{{ t('settings.fontSize') }}</label>
          <input type="number" v-model="settings.fontSize" min="10" max="24" />
        </div>
        <div class="setting-item">
          <label>{{ t('settings.tabSize') }}</label>
          <input type="number" v-model="settings.tabSize" min="1" max="8" />
        </div>
        <div class="setting-item">
          <label>{{ t('settings.wordWrap') }}</label>
          <select v-model="settings.wordWrap">
            <option value="on">{{ t('settings.wordWrapOn') }}</option>
            <option value="off">{{ t('settings.wordWrapOff') }}</option>
            <option value="wordWrapColumn">{{ t('settings.wordWrapColumn') }}</option>
          </select>
        </div>
        <div class="setting-item checkbox">
          <input type="checkbox" id="minimap" v-model="settings.minimap" />
          <label for="minimap">{{ t('settings.enableMinimap') }}</label>
        </div>
        <div class="setting-item checkbox">
          <input type="checkbox" id="lineNumbers" v-model="settings.lineNumbers" />
          <label for="lineNumbers">{{ t('settings.lineNumbers') }}</label>
        </div>
        <div class="setting-item checkbox">
          <input type="checkbox" id="formatOnSave" v-model="settings.formatOnSave" />
          <label for="formatOnSave">{{ t('settings.formatOnSave') }}</label>
        </div>
      </div>
      <div class="settings-group" v-if="activeSection === 'api-keys'">
        <h4>{{ t('settings.apiKeys') }}</h4>
        <p class="setting-description">{{ t('settings.apiKeysDesc') }}</p>
        <div v-if="loadingKeys" class="setting-description">{{ t('settings.loadingApiKeys') }}</div>
        <div v-else>
          <div class="setting-item">
            <label>{{ t('settings.gemini') }}</label>
            <input type="password" :value="apiKeys.gemini || t('settings.notConfigured')" disabled class="api-key-input" />
          </div>
          <div class="setting-item">
            <label>{{ t('settings.chatgpt') }}</label>
            <input type="password" :value="apiKeys.chatgpt || t('settings.notConfigured')" disabled class="api-key-input" />
          </div>
          <div class="setting-item">
            <label>{{ t('settings.claude') }}</label>
            <input type="password" :value="apiKeys.claude || t('settings.notConfigured')" disabled class="api-key-input" />
          </div>
          <div class="setting-item">
            <label>{{ t('settings.mistral') }}</label>
            <input type="password" :value="apiKeys.mistral || t('settings.notConfigured')" disabled class="api-key-input" />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
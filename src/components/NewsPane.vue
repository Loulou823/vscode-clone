<script setup lang="ts">
import { onMounted, ref, onUnmounted, nextTick, watch } from 'vue'
import * as monaco from 'monaco-editor'
import { useI18n } from '../i18n'

const { t, getLocale } = useI18n()

type NewsItem = {
  name?: string
  contents?: string
  version?: number
}

const loading = ref(false)
const error = ref('')
const errorContent = ref('')
const items = ref<NewsItem[]>([])
const editorContainer = ref<HTMLElement>()
let editorInstance: monaco.editor.IStandaloneCodeEditor | null = null
let editorModel: monaco.editor.ITextModel | null = null

// LibreTranslate configuration
const LIBRETRANSLATE_API = 'http://127.0.0.1:5000/translate'
const LIBRETRANSLATE_LANG_MAP: Record<string, string> = {
  en: 'en',
  fr: 'fr',
  ru: 'ru',
  meow: 'en', // Meow falls back to English
}

async function translateText(text: string, targetLang: string): Promise<string> {
  const sourceLang = LIBRETRANSLATE_LANG_MAP[targetLang] || 'en'

  if (sourceLang === 'en') {
    console.log('Skipping translation for English locale')
    return text // No translation needed for English
  }

  console.log(`Translating text to ${sourceLang}:`, text.substring(0, 50) + '...')

  try {
    const response = await fetch(LIBRETRANSLATE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: 'en',
        target: sourceLang,
        format: 'text',
      }),
    })

    console.log('Translation response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.warn('Translation failed:', response.statusText, errorText)
      return text
    }

    const data = await response.json()
    console.log('Translation result:', data.translatedText?.substring(0, 50) + '...')
    return data.translatedText || text
  } catch (err) {
    console.error('Translation error:', err)
    return text
  }
}

async function translateNewsItem(item: NewsItem, targetLang: string): Promise<NewsItem> {
  const translated: NewsItem = { ...item }

  if (item.name) {
    translated.name = await translateText(item.name, targetLang)
  }

  if (item.contents) {
    translated.contents = await translateText(item.contents, targetLang)
  }

  return translated
}

function toNewsItems(payload: unknown): NewsItem[] {
  if (payload && typeof payload === 'object') {
    // Handle single object structure from npoint API
    if ('name' in payload || 'contents' in payload) {
      return [payload as NewsItem]
    }
    // Handle array structure
    if (Array.isArray(payload)) {
      return payload as NewsItem[]
    }
    // Handle object with items/news array
    const maybeItems = (payload as { items?: unknown; news?: unknown }).items ?? (payload as { news?: unknown }).news
    if (Array.isArray(maybeItems)) {
      return maybeItems as NewsItem[]
    }
  }

  return []
}

async function loadNews() {
  loading.value = true
  error.value = ''
  errorContent.value = ''

  if (editorInstance) {
    editorInstance.dispose()
    editorInstance = null
  }
  if (editorModel) {
    editorModel.dispose()
    editorModel = null
  }

  try {
    const result = await window.news.fetch()
    console.log('News fetch result:', result)
    if (!result.success) {
      error.value = result.error || 'Failed to fetch news'
      console.log('Error occurred, checking for content:', 'content' in result)
      if ('content' in result) {
        errorContent.value = (result as { content?: string }).content || ''
        console.log('Error content length:', errorContent.value.length)
      }
      items.value = []
      return
    }

    const rawItems = toNewsItems(result.data)
    const currentLocale = getLocale()

    // Translate items if not in English
    if (currentLocale !== 'en') {
      const translatedItems = await Promise.all(
        rawItems.map(item => translateNewsItem(item, currentLocale))
      )
      items.value = translatedItems
    } else {
      items.value = rawItems
    }
  } catch (err) {
    console.error('Error in loadNews:', err)
    error.value = err instanceof Error ? err.message : String(err)
    items.value = []
  } finally {
    loading.value = false
  }
}

watch(errorContent, async (newContent) => {
  if (newContent) {
    await nextTick()
    console.log('Editor container exists in watcher:', !!editorContainer.value)
    if (editorContainer.value) {
      console.log('Creating monaco model and editor...')
      editorModel = monaco.editor.createModel(newContent, 'html')
      editorInstance = monaco.editor.create(editorContainer.value, {
        model: editorModel,
        readOnly: true,
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 12,
        lineNumbers: 'on',
        wordWrap: 'on',
      })
      console.log('Monaco editor created successfully')
    } else {
      console.log('Container still not available after nextTick')
    }
  }
})

onMounted(() => {
  void loadNews()
})

onUnmounted(() => {
  if (editorInstance) {
    editorInstance.dispose()
  }
  if (editorModel) {
    editorModel.dispose()
  }
})
</script>

<template>
  <section class="news-pane">
    <div class="news-toolbar">
      <h3>{{ t('news.title') }}</h3>
      <button type="button" class="news-refresh" @click="loadNews">{{ t('common.refresh') }}</button>
    </div>

    <div v-if="loading" class="news-state">Loading news...</div>
    <div v-else-if="error" class="news-state news-error">
      <div>{{ error }}</div>
      <div v-if="errorContent" ref="editorContainer" class="news-error-editor"></div>
    </div>
    <div v-else-if="items.length === 0" class="news-state">{{ t('news.noNews') }}</div>
    <div v-else class="news-list">
      <article v-for="(item, index) in items" :key="index" class="news-item">
        <h4>{{ item.name || 'Untitled update' }}</h4>
        <p>{{ item.contents || 'No content provided.' }}</p>
        <div v-if="item.version !== undefined" class="news-meta">
          <span>{{ t('news.version') }}: {{ item.version }}</span>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.news-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.news-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid #333;
}

.news-toolbar h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.news-refresh {
  background: #0e639c;
  color: white;
  border: none;
  padding: 4px 12px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
}

.news-refresh:hover {
  background: #1177bb;
}

.news-state {
  padding: 16px;
  text-align: center;
  color: #888;
  font-size: 13px;
}

.news-error {
  color: #f14c4c;
  text-align: left;
}

.news-error-editor {
  margin-top: 12px;
  height: 300px;
  border: 1px solid #333;
  border-radius: 4px;
  overflow: hidden;
}

.news-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.news-item {
  padding: 12px;
  border-bottom: 1px solid #2d2d2d;
}

.news-item h4 {
  margin: 0 0 8px 0;
  font-size: 13px;
  font-weight: 600;
  color: #e0e0e0;
}

.news-item p {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: #a0a0a0;
  line-height: 1.4;
}

.news-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: #666;
}

.news-meta a {
  color: #3794ff;
  text-decoration: none;
}

.news-meta a:hover {
  text-decoration: underline;
}
</style>

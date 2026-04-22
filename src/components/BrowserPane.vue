<script setup lang="ts">
import { ArrowLeft, ArrowRight, Globe, RotateCw } from 'lucide-vue-next'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { BrowserState } from '../types/workbench'

const props = defineProps<{
  url: string
  state: BrowserState
  visible: boolean
}>()

const emit = defineEmits<{
  navigate: [url: string]
}>()

const browserRoot = ref<HTMLElement | null>(null)
const addressBar = ref(props.url)
let resizeObserver: ResizeObserver | null = null

function normalizedBounds() {
  const rect = browserRoot.value?.getBoundingClientRect()

  if (!rect) {
    return null
  }

  return {
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    width: Math.max(0, Math.round(rect.width)),
    height: Math.max(0, Math.round(rect.height)),
  }
}

async function syncBrowserView() {
  if (!props.visible) {
    window.browser.hide()
    return
  }

  const bounds = normalizedBounds()

  if (!bounds || bounds.width === 0 || bounds.height === 0) {
    return
  }

  await window.browser.show(props.url, bounds)
}

function updateBounds() {
  if (!props.visible) {
    return
  }

  const bounds = normalizedBounds()

  if (!bounds || bounds.width === 0 || bounds.height === 0) {
    return
  }

  window.browser.updateBounds(bounds)
}

function submitNavigation() {
  emit('navigate', addressBar.value)
}

watch(
  () => props.url,
  (url) => {
    addressBar.value = url
    void syncBrowserView()
  },
)

watch(
  () => props.visible,
  () => {
    void syncBrowserView()
  },
)

watch(
  () => props.state.url,
  (url) => {
    if (url) {
      addressBar.value = url
    }
  },
)

onMounted(() => {
  resizeObserver = new ResizeObserver(() => {
    updateBounds()
  })

  if (browserRoot.value) {
    resizeObserver.observe(browserRoot.value)
  }

  window.addEventListener('resize', updateBounds)
  void syncBrowserView()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('resize', updateBounds)
  window.browser.hide()
})

function goBack() {
  window.browser.back()
}

function goForward() {
  window.browser.forward()
}

function reload() {
  window.browser.reload()
}
</script>

<template>
  <section class="browser-pane">
    <div class="browser-toolbar">
      <button class="browser-button" type="button" :disabled="!state.canGoBack" @click="goBack">
        <ArrowLeft :size="14" />
      </button>
      <button class="browser-button" type="button" :disabled="!state.canGoForward" @click="goForward">
        <ArrowRight :size="14" />
      </button>
      <button class="browser-button" type="button" @click="reload">
        <RotateCw :size="14" />
      </button>
      <form class="browser-address-form" @submit.prevent="submitNavigation">
        <Globe :size="14" class="browser-address-icon" />
        <input v-model="addressBar" class="browser-address" type="text" spellcheck="false" />
      </form>
    </div>
    <div class="browser-root" ref="browserRoot"></div>
  </section>
</template>

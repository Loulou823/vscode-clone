<script setup lang="ts">
import { Globe, Newspaper, Plus, X } from 'lucide-vue-next'
import type { WorkbenchTab } from '../types/workbench'

const emit = defineEmits<{
  selectTab: [tab: WorkbenchTab]
  closeTab: [tab: WorkbenchTab]
  openBrowser: []
}>()

defineProps<{
  tabs: WorkbenchTab[]
}>()
</script>

<template>
  <div class="editor-tabs">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="editor-tab"
      :class="{ active: tab.active }"
      type="button"
      @click="emit('selectTab', tab)"
    >
      <Globe v-if="tab.kind === 'browser'" :size="14" />
      <Newspaper v-else-if="tab.kind === 'news'" :size="14" />
      <span class="editor-tab-label">{{ tab.name }}</span>
      <span class="editor-tab-spacer"></span>
      <span class="editor-tab-close" @click.stop="emit('closeTab', tab)">
        <X :size="12" />
      </span>
    </button>
    <button class="editor-tab-action" type="button" @click="emit('openBrowser')">
      <Plus :size="14" />
      <span>Browser</span>
    </button>
  </div>
</template>

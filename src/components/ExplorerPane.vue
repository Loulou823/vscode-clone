<script setup lang="ts">
import { FileCode2, Folder, FolderOpen } from 'lucide-vue-next'
import type { ExplorerItem } from '../types/workbench'

const emit = defineEmits<{
  openFolder: []
  openFile: []
  selectItem: [item: ExplorerItem]
}>()

defineProps<{
  workspaceName: string
  items: ExplorerItem[]
}>()
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <span>Explorer</span>
      <span class="sidebar-project">{{ workspaceName }}</span>
    </div>
    <div class="sidebar-toolbar">
      <button class="sidebar-tool" type="button" @click="emit('openFolder')">
        <FolderOpen :size="14" />
        <span>Open Folder</span>
      </button>
      <button class="sidebar-tool" type="button" @click="emit('openFile')">
        <FileCode2 :size="14" />
        <span>Open File</span>
      </button>
    </div>
    <section class="sidebar-group">
      <header class="sidebar-group-title">Project Files</header>
      <div v-if="items.length === 0" class="sidebar-empty">
        Select a folder to populate the explorer.
      </div>
      <button
        v-for="item in items"
        :key="item.path"
        class="sidebar-item"
        :class="{ active: item.active, directory: item.kind === 'directory' }"
        :style="{ '--depth': item.depth ?? 0 }"
        type="button"
        @click="emit('selectItem', item)"
      >
        <span class="sidebar-item-indent"></span>
        <component :is="item.kind === 'directory' ? Folder : FileCode2" :size="14" class="sidebar-item-icon" />
        <span>{{ item.name }}</span>
      </button>
    </section>
  </aside>
</template>

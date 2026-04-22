<script setup lang="ts">
import { ref } from 'vue'
import { GitBranch, GitCommit, Plus, RefreshCw } from 'lucide-vue-next'

const changes = ref([
  { path: 'src/App.vue', status: 'M' },
  { path: 'src/components/ActivityBar.vue', status: 'M' },
  { path: 'src/utils/languageDetection.ts', status: 'A' },
])

const stagedChanges = ref<string[]>([])

function getStatusIcon(status: string) {
  switch (status) {
    case 'M': return 'M'
    case 'A': return 'A'
    case 'D': return 'D'
    default: return '?'
  }
}
</script>

<template>
  <section class="sidebar source-control-pane">
    <div class="sidebar-header">
      <h3>Source Control</h3>
      <div class="sc-actions">
        <button class="sc-action" title="Refresh">
          <RefreshCw :size="16" />
        </button>
        <button class="sc-action primary" title="Commit">
          <GitCommit :size="16" />
        </button>
      </div>
    </div>
    <div class="sc-message">
      <input
        type="text"
        class="sc-message-input"
        placeholder="Commit message"
        spellcheck="false"
      />
    </div>
    <div class="sc-section">
      <div class="sc-section-header">
        <span>Changes</span>
        <span class="sc-badge">{{ changes.length }}</span>
      </div>
      <div class="sc-change" v-for="change in changes" :key="change.path">
        <span class="sc-status">{{ getStatusIcon(change.status) }}</span>
        <span class="sc-path">{{ change.path }}</span>
      </div>
    </div>
    <div class="sc-empty">
      <GitBranch :size="32" />
      <p>No changes detected</p>
    </div>
  </section>
</template>
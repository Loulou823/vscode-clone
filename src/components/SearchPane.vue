<script setup lang="ts">
import { ref } from 'vue'
import { Search, FileSearch, FolderSearch } from 'lucide-vue-next'

const searchQuery = ref('')
const searchType = ref<'files' | 'content'>('files')
</script>

<template>
  <section class="sidebar search-pane">
    <div class="sidebar-header">
      <h3>Search</h3>
    </div>
    <div class="search-input-row">
      <Search :size="16" class="search-icon" />
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        placeholder="Search"
        spellcheck="false"
      />
    </div>
    <div class="search-options">
      <button
        class="search-option"
        :class="{ active: searchType === 'files' }"
        @click="searchType = 'files'"
      >
        <FileSearch :size="14" />
        <span>Files</span>
      </button>
      <button
        class="search-option"
        :class="{ active: searchType === 'content' }"
        @click="searchType = 'content'"
      >
        <FolderSearch :size="14" />
        <span>Content</span>
      </button>
    </div>
    <div class="search-results">
      <div class="search-empty">
        <Search :size="32" />
        <p>Enter a search term to find files</p>
      </div>
    </div>
  </section>
</template>
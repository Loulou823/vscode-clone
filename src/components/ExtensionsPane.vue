<script setup lang="ts">
import { ref } from 'vue'
import { Blocks, Search, Download, Star } from 'lucide-vue-next'

const extensions = ref([
  
])

const searchQuery = ref('')
</script>

<template>
  <section class="sidebar extensions-pane">
    <div class="sidebar-header">
      <h3>Extensions</h3>
    </div>
    <div class="search-input-row">
      <Search :size="16" class="search-icon" />
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        placeholder="Search extensions"
        spellcheck="false"
      />
    </div>
    <div class="extensions-list">
      <div class="marquee">
        extensions are coming soon
      </div>
    </div>
  </section>
</template>
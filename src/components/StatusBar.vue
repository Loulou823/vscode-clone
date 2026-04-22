<script setup lang="ts">
defineProps<{
  items: string[]
  statusMessage: string
}>()
</script>

<template>
<footer class="statusbar">
  <div class="status-items">
    <span v-for="item in items" :key="item" class="status-item">{{ item }}</span>
  </div>
  <div class="status-items right">
    <span class="status-item">Spaces: 2</span>
    <span class="status-item">UTF-8</span>
    <span class="status-item">CRLF</span>
    <span class="status-item">TypeScript</span>
    <span v-if="statusMessage" class="status-item message">{{ statusMessage }}</span>
  </div>
</footer>
</template>

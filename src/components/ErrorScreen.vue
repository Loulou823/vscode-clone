<script setup lang="ts">
defineProps<{
  error: Error | null
  message?: string
}>()

function handleClose() {
  window.appWindow.close()
}
</script>

<template>
  <div class="error-screen">
    <div class="error-content">
      <div class="error-icon">⚠️</div>
      <h1 class="error-title">Something went wrong</h1>
      <p class="error-message">{{ message || error?.message || 'An unexpected error occurred' }}</p>
      <button class="retry-button" @click="handleClose">Close App</button>
    </div>
  </div>
</template>

<style scoped>
.error-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: var(--vscode-bg, #1e1e1e);
  color: #cccccc;
}

.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
}

.error-icon {
  font-size: 64px;
  line-height: 1;
}

.error-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

.error-message {
  font-size: 14px;
  color: #8b8b8b;
  max-width: 400px;
  margin: 0;
}

.retry-button {
  padding: 8px 16px;
  font-size: 14px;
  background: #007acc;
  color: #ffffff;
  border: none;
  border-radius: 2px;
  cursor: pointer;
}

.retry-button:hover {
  background: #0062a3;
}
</style>
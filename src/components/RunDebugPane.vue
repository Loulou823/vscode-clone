<script setup lang="ts">
import { ref } from 'vue'
import { Play, Square, Bug, FileCode, ChevronDown } from 'lucide-vue-next'

const selectedConfig = ref('')
const configs = ref([
  { id: '1', name: 'Launch App', type: 'launch' },
  { id: '2', name: 'Debug Tests', type: 'launch' },
])

const isRunning = ref(false)

function runDebug() {
  isRunning.value = !isRunning.value
}
</script>

<template>
  <section class="sidebar run-debug-pane">
    <div class="sidebar-header">
      <h3>Run and Debug</h3>
    </div>
    <div class="run-config">
      <button class="run-config-btn">
        <FileCode :size="14" />
        <span>{{ selectedConfig || 'Select configuration' }}</span>
        <ChevronDown :size="14" />
      </button>
    </div>
    <div class="run-actions">
      <button class="run-action" :class="{ running: isRunning }" @click="runDebug">
        <Play :size="16" v-if="!isRunning" />
        <Square :size="16" v-else />
        <span>{{ isRunning ? 'Stop' : 'Start' }}</span>
      </button>
      <button class="run-action" :disabled="!isRunning">
        <Bug :size="16" />
        <span>Debug</span>
      </button>
    </div>
    <div class="run-empty">
      <Play :size="32" />
      <p>Configure a debug launch to start debugging</p>
    </div>
  </section>
</template>
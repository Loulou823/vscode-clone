<script setup lang="ts">
import { ref } from 'vue'
import { Play, Square, Pause, SkipForward, SkipBack, Circle, RefreshCw } from 'lucide-vue-next'

const debugState = ref({
  isRunning: false,
  isPaused: false,
  currentLine: 10,
  currentFile: 'src/App.vue',
})

const breakpoints = ref([
  { id: '1', file: 'src/App.vue', line: 10, enabled: true },
  { id: '2', file: 'src/App.vue', line: 25, enabled: false },
])

const callStack = ref([
  { id: '1', name: 'handleActivityItemClick', file: 'src/App.vue', line: 10 },
  { id: '2', name: 'handleItemClick', file: 'src/components/ActivityBar.vue', line: 5 },
])
</script>

<template>
  <section class="sidebar debug-pane">
    <div class="sidebar-header">
      <h3>Debug</h3>
      <div class="debug-actions">
        <button class="debug-action" :class="{ active: debugState.isRunning }">
          <Play :size="16" />
        </button>
        <button class="debug-action" :disabled="!debugState.isRunning">
          <Pause :size="16" />
        </button>
        <button class="debug-action" :disabled="!debugState.isPaused">
          <SkipForward :size="16" />
        </button>
        <button class="debug-action" :disabled="!debugState.isRunning">
          <Circle :size="16" />
        </button>
      </div>
    </div>
    <div class="debug-status">
      <span class="debug-status-indicator" :class="{ running: debugState.isRunning, paused: debugState.isPaused }"></span>
      <span>{{ debugState.isRunning ? 'Running' : debugState.isPaused ? 'Paused' : 'Stopped' }}</span>
    </div>
    <div class="debug-section">
      <div class="debug-section-header">Breakpoints</div>
      <div class="debug-breakpoint" v-for="bp in breakpoints" :key="bp.id">
        <input type="checkbox" :checked="bp.enabled" />
        <span class="debug-file">{{ bp.file }}:{{ bp.line }}</span>
      </div>
    </div>
    <div class="debug-section">
      <div class="debug-section-header">Call Stack</div>
      <div class="debug-call-stack" v-for="frame in callStack" :key="frame.id">
        <span class="debug-function">{{ frame.name }}</span>
        <span class="debug-location">{{ frame.file }}:{{ frame.line }}</span>
      </div>
    </div>
    <div class="debug-section">
      <div class="debug-section-header">Variables</div>
      <div class="debug-var">
        <span class="debug-var-name">activeView</span>
        <span class="debug-var-value">"explorer"</span>
      </div>
      <div class="debug-var">
        <span class="debug-var-name">tabs</span>
        <span class="debug-var-value">[]</span>
      </div>
    </div>
  </section>
</template>
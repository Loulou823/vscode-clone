<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, onBeforeUnmount } from 'vue'
import type { CodeProblem } from '../types/workbench'
import { useI18n } from '../i18n'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

const { t } = useI18n()

const props = defineProps<{
  items: string[]
  problems: CodeProblem[]
}>()

const emit = defineEmits<{
  'update:activeItem': [item: string]
  'select-problem': [problem: CodeProblem]
  'port-click': [port: number]
}>()

const activeItem = ref(props.items[props.items.length - 1])
const terminalInitialized = ref(false)
const ports = ref<Array<{ port: number; process: string; pid?: number; type: 'app' | 'system' }>>([])
const loadingPorts = ref(false)

const showTerminal = computed(() => activeItem.value === 'TERMINAL')

function selectItem(item: string) {
  activeItem.value = item
  emit('update:activeItem', item)

  if (item === 'TERMINAL' && !terminalInitialized.value) {
    setTimeout(initTerminal, 0)
    terminalInitialized.value = true
  }

  if (item === 'PORTS') {
    loadPorts()
  }
}

async function loadPorts() {
  loadingPorts.value = true
  try {
    const result = await window.ports.list()
    if (result.success && result.ports) {
      ports.value = result.ports
    }
  } catch (err) {
    console.error('Failed to load ports:', err)
  } finally {
    loadingPorts.value = false
  }
}

function selectProblem(problem: CodeProblem) {
  emit('select-problem', problem)
}

function formatSeverity(severity: CodeProblem['severity']) {
  return severity.toUpperCase()
}

const terminalRef = ref<HTMLDivElement | null>(null)
const terminalInstance = ref<Terminal | null>(null)
const fitAddon = ref<FitAddon | null>(null)
let unsubscribeData: (() => void) | null = null
let unsubscribeExit: (() => void) | null = null

function initTerminal() {
  if (!terminalRef.value) return

  const term = new Terminal({
    cursorBlink: true,
    fontSize: 13,
    fontFamily: 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
    theme: {
      background: '#181818',
      foreground: '#b8b8b8',
      cursor: '#b8b8b8',
    },
  })

  const fit = new FitAddon()
  term.loadAddon(fit)

  term.open(terminalRef.value)
  fit.fit()

  terminalInstance.value = term
  fitAddon.value = fit

  term.onData((data) => {
    window.terminal.write(data)
  })

  term.writeln('Terminal ready.')
  term.write('$ ')
}

function handleResize() {
  fitAddon.value?.fit()
}

onMounted(async () => {
  await window.terminal.start()

  unsubscribeData = window.terminal.onData((data) => {
    terminalInstance.value?.write(data)
  })

  unsubscribeExit = window.terminal.onExit((code) => {
    terminalInstance.value?.writeln(`\r\n[process exited with code ${code}]`)
  })

  if (showTerminal.value) {
    initTerminal()
  }

  if (activeItem.value === 'PORTS') {
    loadPorts()
  }
})

onBeforeUnmount(() => {
  unsubscribeData?.()
  unsubscribeExit?.()
  terminalInstance.value?.dispose()
})
</script>

<template>
  <section class="bottom-panel">
    <div class="panel-tabs">
      <button
        v-for="item in items"
        :key="item"
        class="panel-tab"
        :class="{ active: activeItem === item }"
        type="button"
        @click="selectItem(item)"
      >
        {{ item }}
      </button>
    </div>
    <div class="panel-body">
      <div v-if="activeItem === 'PROBLEMS'" class="problems-panel">
        <div v-if="problems.length === 0" class="empty-message">No problems have been detected in the current file.</div>
        <div v-else class="problems-list">
          <button
            v-for="(problem, index) in problems"
            :key="`${problem.line}-${problem.column}-${index}`"
            class="problem-item"
            type="button"
            @click="selectProblem(problem)"
          >
            <span class="problem-severity" :class="problem.severity">{{ formatSeverity(problem.severity) }}</span>
            <span class="problem-message">{{ problem.message }}</span>
            <span class="problem-location">Ln {{ problem.line }}, Col {{ problem.column }}</span>
          </button>
        </div>
      </div>
      <div v-else-if="activeItem === 'OUTPUT'" class="output-panel">
        <div class="empty-message">No output has been produced yet.</div>
      </div>
      <div v-else-if="activeItem === 'DEBUG CONSOLE'" class="debug-console-panel">
        <div class="empty-message">Start debugging to see output here.</div>
      </div>
      <div v-else-if="activeItem === 'TERMINAL'" class="terminal-panel" ref="terminalRef"></div>
      <div v-else-if="activeItem === 'PORTS'" class="ports-panel">
        <div v-if="loadingPorts" class="empty-message">{{ t('ports.loading') }}</div>
        <div v-else-if="ports.length === 0" class="empty-message">{{ t('ports.noPorts') }}</div>
        <div v-else class="ports-list">
          <button
            v-for="port in ports"
            :key="port.port"
            class="port-item"
            :class="{ 'app-port': port.type === 'app' }"
            type="button"
            @click="emit('port-click', port.port)"
          >
            <span class="port-number">:{{ port.port }}</span>
            <span class="port-process">{{ port.process }}</span>
            <span v-if="port.pid" class="port-pid">PID: {{ port.pid }}</span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
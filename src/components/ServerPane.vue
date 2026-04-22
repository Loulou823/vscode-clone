<script setup lang="ts">
import { ref } from 'vue'
import { Play, Square, Globe, FolderOpen, Save, FileCode } from 'lucide-vue-next'

const port = ref(3000)
const rootPath = ref('')
const serverRunning = ref(false)
const activeServerPort = ref<number | null>(null)
const serverOutput = ref<string[]>([])
const currentFilePath = ref('')
const currentFileContent = ref('')

async function openFolder() {
  const folder = await window.fs.openFolder()
  if (folder) {
    rootPath.value = folder.rootPath
    addOutput(`Root folder set to: ${folder.rootPath}`)
  }
}

async function startServer() {
  if (!rootPath.value) {
    addOutput('Please select a folder first')
    return
  }

  addOutput(`Starting server on port ${port.value}...`)
  const result = await window.server.start({ port: port.value, rootPath: rootPath.value })

  if (result.success) {
    serverRunning.value = true
    activeServerPort.value = result.port ?? null
    addOutput(`Server running at http://localhost:${result.port}`)
  } else {
    addOutput(`Error: ${result.error}`)
  }
}

async function stopServer() {
  if (activeServerPort.value) {
    addOutput(`Stopping server on port ${activeServerPort.value}...`)
    const result = await window.server.stop(activeServerPort.value)

    if (result.success) {
      serverRunning.value = false
      activeServerPort.value = null
      addOutput('Server stopped')
    } else {
      addOutput(`Error: ${result.error}`)
    }
  }
}

async function openFile() {
  const file = await window.fs.openFile()
  if (file) {
    currentFilePath.value = file.path
    currentFileContent.value = file.content
    addOutput(`Opened: ${file.name}`)
  }
}

async function saveFile() {
  if (!currentFilePath.value) {
    addOutput('No file is currently open')
    return
  }

  const result = await window.file.save({
    filePath: currentFilePath.value,
    content: currentFileContent.value,
  })

  if (result.success) {
    addOutput(`Saved: ${currentFilePath.value}`)
    if (serverRunning.value && activeServerPort.value) {
      addOutput(`Refresh http://localhost:${activeServerPort.value} to see changes`)
    }
  } else {
    addOutput(`Error saving: ${result.error}`)
  }
}

function addOutput(message: string) {
  serverOutput.value.push(`[${new Date().toLocaleTimeString()}] ${message}`)
}
</script>

<template>
  <section class="sidebar server-pane">
    <div class="sidebar-header">
      <h3>Web Server</h3>
    </div>

    <div class="server-config">
      <div class="config-row">
        <label>Port:</label>
        <input v-model="port" type="number" :disabled="serverRunning" min="1024" max="65535" />
      </div>
      <div class="config-row">
        <label>Root Folder:</label>
        <div class="folder-input">
          <input v-model="rootPath" type="text" disabled />
          <button @click="openFolder" :disabled="serverRunning" title="Open Folder">
            <FolderOpen :size="16" />
          </button>
        </div>
      </div>
      <div class="server-actions">
        <button v-if="!serverRunning" class="btn-primary" @click="startServer">
          <Play :size="14" /> Start Server
        </button>
        <button v-else class="btn-danger" @click="stopServer">
          <Square :size="14" /> Stop Server
        </button>
      </div>
    </div>

    <div v-if="serverRunning" class="server-status">
      <Globe :size="14" />
      <span>Running at http://localhost:{{ activeServerPort }}</span>
    </div>

    <div class="file-section">
      <h4>Quick File Editor</h4>
      <div class="file-actions">
        <button @click="openFile">
          <FileCode :size="14" /> Open File
        </button>
        <button @click="saveFile" :disabled="!currentFilePath">
          <Save :size="14" /> Save
        </button>
      </div>
      <div v-if="currentFilePath" class="file-path">
        {{ currentFilePath }}
      </div>
      <textarea
        v-model="currentFileContent"
        class="file-editor"
        placeholder="Open a file to edit..."
        spellcheck="false"
      ></textarea>
    </div>

    <div class="server-output">
      <h4>Output</h4>
      <div class="output-log">
        <div v-for="(line, index) in serverOutput" :key="index" class="output-line">
          {{ line }}
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.server-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0;
}

.server-config {
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
}

.config-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

.config-row label {
  font-size: 12px;
  color: var(--text-secondary);
}

.config-row input {
  padding: 6px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-input);
  color: var(--text-primary);
}

.folder-input {
  display: flex;
  gap: 4px;
}

.folder-input input {
  flex: 1;
}

.folder-input button {
  padding: 6px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  cursor: pointer;
}

.folder-input button:hover {
  background: var(--hover-bg);
}

.server-actions {
  display: flex;
  gap: 8px;
}

.btn-primary,
.btn-danger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}

.btn-primary {
  background: var(--accent-color);
  color: white;
}

.btn-danger {
  background: #c42b1c;
  color: white;
}

.btn-primary:disabled,
.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.server-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #89d185;
  color: #1e1e1e;
  font-size: 13px;
}

.file-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
  min-height: 0;
}

.file-section h4 {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

.file-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.file-actions button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 12px;
  cursor: pointer;
}

.file-actions button:hover:not(:disabled) {
  background: var(--hover-bg);
}

.file-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.file-path {
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  word-break: break-all;
}

.file-editor {
  flex: 1;
  min-height: 100px;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 12px;
  resize: none;
}

.server-output {
  height: 150px;
  display: flex;
  flex-direction: column;
  padding: 12px;
}

.server-output h4 {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

.output-log {
  flex: 1;
  overflow: auto;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 8px;
  font-family: ui-monospace, monospace;
  font-size: 11px;
}

.output-line {
  color: var(--text-primary);
  margin-bottom: 2px;
}
</style>
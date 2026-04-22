<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { Bot, Send, FolderOpen } from 'lucide-vue-next'
import { useI18n } from '../i18n'

const { t } = useI18n()

type Provider = 'chatgpt' | 'claude' | 'gemini' | 'mistral'
type AgentMessage = {
  role: 'user' | 'assistant'
  text: string
}

type ApiKeys = {
  gemini: string
  chatgpt: string
  claude: string
  mistral: string
}

const WORK_DIR_KEY = 'vscode-clone.ai-work-dir'

const provider = ref<Provider>('gemini')
const prompt = ref('')
const sending = ref(false)
const workDir = ref('')
const messages = ref<AgentMessage[]>([
  {
    role: 'assistant',
    text: t('ai.ready'),
  },
])

const keys = ref<ApiKeys>({
  gemini: '',
  chatgpt: '',
  claude: '',
  mistral: '',
})

const loadingKeys = ref(false)

async function loadKeys() {
  loadingKeys.value = true
  try {
    const result = await window.apiKeys.get()
    if (result.success && result.keys) {
      keys.value = result.keys
    }
  } catch (err) {
    console.error('Failed to load API keys:', err)
  } finally {
    loadingKeys.value = false
  }
}

onMounted(() => {
  loadKeys()
  loadWorkDir()
})

function loadWorkDir() {
  try {
    const raw = localStorage.getItem(WORK_DIR_KEY)
    if (raw) {
      workDir.value = raw
    }
  } catch {
    // Ignore errors
  }
}

async function selectWorkDir() {
  try {
    const result = await window.fs.openFolder()
    if (result) {
      workDir.value = result.rootPath
      localStorage.setItem(WORK_DIR_KEY, result.rootPath)
    }
  } catch (err) {
    console.error('Failed to select work directory:', err)
  }
}

const activeProviderKey = computed(() => {
  if (provider.value === 'chatgpt') return keys.value.chatgpt
  if (provider.value === 'claude') return keys.value.claude
  if (provider.value === 'mistral') return keys.value.mistral
  return keys.value.gemini
})

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderMarkdown(text: string) {
  const escaped = escapeHtml(text)

  return escaped
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/(?:^|\n)- (.+)/g, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/\n/g, '<br />')
}

function toIpcHistory(history: AgentMessage[]) {
  return history.map((message) => ({
    role: message.role,
    text: message.text,
  }))
}

async function submitPrompt() {
  if (sending.value) {
    return
  }

  const value = prompt.value.trim()
  if (!value) {
    return
  }

  const historyBeforePrompt = messages.value.slice()
  messages.value.push({ role: 'user', text: value })
  prompt.value = ''

  if (!activeProviderKey.value) {
    messages.value.push({
      role: 'assistant',
      text: t('ai.noApiKey', { provider: provider.value }),
    })
    return
  }

  sending.value = true

  // Create an empty assistant message that will be updated with streaming content
  const assistantMessageIndex = messages.value.length
  messages.value.push({ role: 'assistant', text: '' })

  // Add file context if working directory is set
  let enhancedPrompt = value
  if (workDir.value) {
    try {
      const dirResult = await (window.ai as any).fs.listDirectory(workDir.value)
      if (dirResult.success && dirResult.entries) {
        const fileList = dirResult.entries
          .filter((e: { kind: string }) => e.kind === 'file')
          .map((e: { name: string }) => `  - ${e.name}`)
          .join('\n')
        const dirList = dirResult.entries
          .filter((e: { kind: string }) => e.kind === 'directory')
          .map((e: { name: string }) => `  - ${e.name}/`)
          .join('\n')
        enhancedPrompt = `Working directory: ${workDir.value}\n\nDirectories:\n${dirList}\n\nFiles:\n${fileList}\n\nUser question: ${value}`
      }
    } catch (err) {
      console.error('Failed to get file context:', err)
    }
  }

  try {
    ;(window.ai as any).chatStream({
      provider: provider.value,
      apiKey: activeProviderKey.value,
      prompt: enhancedPrompt,
      history: toIpcHistory(historyBeforePrompt),
      onChunk: (chunk: { content: string }) => {
        // Update the assistant message with the new chunk
        messages.value[assistantMessageIndex].text += chunk.content
      },
      onComplete: (result: { success: boolean; response?: string; error?: string }) => {
        if (!result.success) {
          messages.value[assistantMessageIndex].text = result.error || 'Unknown AI backend error.'
        }
        sending.value = false
      },
    })
  } catch (err) {
    messages.value[assistantMessageIndex].text = err instanceof Error ? err.message : String(err)
    sending.value = false
  }
}
</script>

<template>
  <aside class="ai-panel">
    <header class="ai-panel-header">
      <div class="ai-panel-title">
        <Bot :size="15" />
        <span>{{ t('ai.title') }}</span>
      </div>
      <span class="ai-provider-chip">{{ provider }}</span>
    </header>

    <section class="ai-chat">
      <div class="ai-chat-toolbar">
        <label>
          {{ t('ai.modelProvider') }}
          <select v-model="provider">
            <option value="chatgpt">ChatGPT</option>
            <option value="claude">Claude</option>
            <option value="gemini">Gemini</option>
            <option value="mistral">Mistral</option>
          </select>
        </label>
        <button type="button" class="ai-work-dir-btn" @click="selectWorkDir" title="Select working directory">
          <FolderOpen :size="14" />
          <span v-if="workDir">{{ workDir.slice(0, 30) }}...</span>
          <span v-else>{{ t('ai.selectWorkDir') }}</span>
        </button>
      </div>

      <div class="ai-messages">
        <div v-for="(message, index) in messages" :key="index" class="ai-message" :class="message.role">
          <template v-if="message.role === 'assistant'">
            <div class="ai-markdown" v-html="renderMarkdown(message.text)"></div>
          </template>
          <template v-else>
            {{ message.text }}
          </template>
        </div>
      </div>

      <form class="ai-input-row" @submit.prevent="submitPrompt">
        <input v-model="prompt" type="text" :disabled="sending" :placeholder="t('ai.askAssistant')" spellcheck="false" />
        <button type="submit" :disabled="sending">
          <Send :size="14" />
        </button>
      </form>
    </section>
  </aside>
</template>

<style scoped>
.ai-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
  border-right: 1px solid #333;
}

.ai-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #252526;
  border-bottom: 1px solid #333;
}

.ai-panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #e0e0e0;
}

.ai-provider-chip {
  font-size: 11px;
  padding: 2px 8px;
  background: #007acc;
  color: white;
  border-radius: 12px;
  text-transform: uppercase;
}

.ai-keys {
  padding: 12px;
  border-bottom: 1px solid #333;
}

.ai-keys h4 {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 10px 0;
  font-size: 12px;
  font-weight: 600;
  color: #e0e0e0;
}

.ai-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.ai-field span {
  font-size: 11px;
  color: #aaa;
}

.ai-field input {
  padding: 4px 8px;
  font-size: 11px;
  background: #3c3c3c;
  border: 1px solid #3c3c3c;
  border-radius: 2px;
  color: #e0e0e0;
}

.ai-field input:focus {
  outline: none;
  border-color: #007acc;
}

.ai-chat {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.ai-chat-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #252526;
  border-bottom: 1px solid #333;
  gap: 8px;
}

.ai-chat-toolbar label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: #aaa;
}

.ai-chat-toolbar select {
  padding: 2px 6px;
  font-size: 11px;
  background: #3c3c3c;
  border: 1px solid #3c3c3c;
  border-radius: 2px;
  color: #e0e0e0;
}

.ai-chat-toolbar select:focus {
  outline: none;
  border-color: #007acc;
}

.ai-work-dir-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  font-size: 11px;
  background: #3c3c3c;
  border: 1px solid #3c3c3c;
  border-radius: 2px;
  color: #e0e0e0;
  cursor: pointer;
  white-space: nowrap;
}

.ai-work-dir-btn:hover {
  background: #4c4c4c;
  border-color: #555;
}

.ai-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.ai-message {
  margin-bottom: 12px;
  font-size: 13px;
  line-height: 1.5;
}

.ai-message.user {
  color: #e0e0e0;
}

.ai-message.assistant {
  color: #cccccc;
}

.ai-markdown {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.ai-markdown h1,
.ai-markdown h2,
.ai-markdown h3 {
  margin: 8px 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: #e0e0e0;
}

.ai-markdown h1 {
  font-size: 16px;
}

.ai-markdown code {
  padding: 2px 4px;
  background: #2d2d2d;
  border-radius: 2px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: #e0e0e0;
}

.ai-markdown ul {
  margin: 4px 0;
  padding-left: 20px;
}

.ai-markdown li {
  margin: 2px 0;
}

.ai-markdown a {
  color: #3794ff;
  text-decoration: none;
}

.ai-markdown a:hover {
  text-decoration: underline;
}

.ai-input-row {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #252526;
  border-top: 1px solid #333;
  gap: 8px;
}

.ai-input-row input {
  flex: 1;
  padding: 6px 10px;
  font-size: 13px;
  background: #3c3c3c;
  border: 1px solid #3c3c3c;
  border-radius: 2px;
  color: #e0e0e0;
}

.ai-input-row input:focus {
  outline: none;
  border-color: #007acc;
}

.ai-input-row input:disabled {
  opacity: 0.5;
}

.ai-input-row button {
  padding: 6px 10px;
  background: #007acc;
  border: none;
  border-radius: 2px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-input-row button:hover:not(:disabled) {
  background: #005a9e;
}

.ai-input-row button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

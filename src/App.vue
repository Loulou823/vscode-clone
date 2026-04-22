<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, onErrorCaptured, ref } from 'vue'
import ActivityBar from './components/ActivityBar.vue'
import AIAgentPanel from './components/AIAgentPanel.vue'
import BottomPanel from './components/BottomPanel.vue'
import BrowserPane from './components/BrowserPane.vue'
import DebugPane from './components/DebugPane.vue'
import EditorPane from './components/EditorPane.vue'
import EditorTabs from './components/EditorTabs.vue'
import ErrorScreen from './components/ErrorScreen.vue'
import ExplorerPane from './components/ExplorerPane.vue'
import HomeScreen from './components/HomeScreen.vue'
import ExtensionsPane from './components/ExtensionsPane.vue'
import NewsPane from './components/NewsPane.vue'
import RunDebugPane from './components/RunDebugPane.vue'
import SearchPane from './components/SearchPane.vue'
import ServerPane from './components/ServerPane.vue'
import SettingsPane from './components/SettingsPane.vue'
import SourceControlPane from './components/SourceControlPane.vue'
import StatusBar from './components/StatusBar.vue'
import TitleBar from './components/TitleBar.vue'
import { bottomItems, defaultEditorContent } from './data/workbench'
import { useActivityItems } from './composables/useActivityItems'
import type { BrowserState, BrowserTab, CodeProblem, ExplorerItem, NewsTab, RevealTarget, WorkbenchTab } from './types/workbench'
import { detectLanguage } from './utils/languageDetection'
import { LogIn } from './utils/loginlogic'

const activityItems = useActivityItems()

onMounted(() => {
  LogIn()
})

const appError = ref<Error | null>(null)

onErrorCaptured((err) => {
  appError.value = err
  return false
})

const explorerItems = ref<ExplorerItem[]>([])
const tabs = ref<WorkbenchTab[]>([])
const workspaceName = ref('No Folder Opened')
const workspacePath = ref('')
const activeFilePath = ref<string | null>(null)
const editorContent = ref(defaultEditorContent)
const browserState = ref<BrowserState>({
  url: 'internal://home',
  title: 'Browser',
  canGoBack: false,
  canGoForward: false,
  loading: false,
})
const statusMessage = ref('')
const statusMessageTimeout = ref<number | null>(null)
const activeView = ref<string>('explorer')
const activeBottomItem = ref('TERMINAL')
const currentTheme = ref('dark')
const problems = ref<CodeProblem[]>([])
const revealTarget = ref<RevealTarget | null>(null)
const leftPanelVisible = ref(true)
const aiPanelVisible = ref(true)
const bottomPanelVisible = ref(true)
const leftPanelWidth = ref(272)
const aiPanelWidth = ref(320)
const bottomPanelHeight = ref(200)
const resizingPanel = ref<'left' | 'right' | 'bottom' | null>(null)
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
})
let unsubscribeBrowserState: (() => void) | null = null
let unsubscribeSaveFile: (() => void) | null = null

const activeTab = computed(() => tabs.value.find((tab) => tab.active) ?? null)
const activeTabName = computed(() => activeTab.value?.name ?? 'Home')
const activeLanguage = computed(() => getLanguageFromPath(activeFilePath.value))
const activeBrowserTab = computed(() => activeTab.value?.kind === 'browser' ? activeTab.value : null)
const mainShellGridTemplate = computed(() => {
  const columns = ['var(--activitybar-width)']

  if (leftPanelVisible.value) {
    columns.push(`${leftPanelWidth.value}px`, '4px')
  }

  columns.push('minmax(0, 1fr)')

  if (aiPanelVisible.value) {
    columns.push('4px', `${aiPanelWidth.value}px`)
  }

  return columns.join(' ')
})
const editorColumnRows = computed(() => (
  bottomPanelVisible.value
    ? `var(--tabs-height) minmax(0, 1fr) 4px ${bottomPanelHeight.value}px`
    : 'var(--tabs-height) minmax(0, 1fr)'
))

const statusItems = computed(() => [
  workspaceName.value,
  activeTabName.value,
  tabs.value.length > 0 ? `${tabs.value.length} open` : 'No file open',
  activeBrowserTab.value ? browserState.value.url || activeBrowserTab.value.url : workspacePath.value || 'Ready',
])

function activateTabById(tabId: string) {
  tabs.value = tabs.value.map((tab) => ({
    ...tab,
    active: tab.id === tabId,
  }))

  const nextActiveTab = tabs.value.find((tab) => tab.id === tabId) ?? null

  if (nextActiveTab?.kind === 'file') {
    activeFilePath.value = nextActiveTab.path
    explorerItems.value = explorerItems.value.map((item) => ({
      ...item,
      active: item.kind === 'file' && item.path === nextActiveTab.path,
    }))
    window.browser.hide()
    return
  }

  explorerItems.value = explorerItems.value.map((item) => ({
    ...item,
    active: false,
  }))
}

async function openFileByPath(filePath: string) {
  const file = await window.fs.readFile(filePath)
  editorContent.value = file.content

  if (!tabs.value.some((tab) => tab.kind === 'file' && tab.path === file.path)) {
    tabs.value = [
      ...tabs.value,
      {
        id: file.path,
        kind: 'file',
        name: file.name,
        path: file.path,
      },
    ]
  }

  activateTabById(file.path)
}

async function saveActiveFile() {
  if (!activeFilePath.value) {
    return
  }

  await window.file.save({
    filePath: activeFilePath.value,
    content: editorContent.value,
  })

  statusMessage.value = 'File saved'

  if (statusMessageTimeout.value) {
    clearTimeout(statusMessageTimeout.value)
  }

  statusMessageTimeout.value = window.setTimeout(() => {
    statusMessage.value = ''
    statusMessageTimeout.value = null
  }, 2000)
}

function openBrowserTab(url = 'internal://home') {
  const existingBrowserTab = tabs.value.find((tab): tab is BrowserTab => tab.kind === 'browser')

  if (existingBrowserTab) {
    existingBrowserTab.url = url
    browserState.value = {
      ...browserState.value,
      url,
    }
    activateTabById(existingBrowserTab.id)
    return
  }

  const browserTab: BrowserTab = {
    id: 'browser-tab',
    kind: 'browser',
    name: 'Browser',
    url,
  }

  tabs.value = [...tabs.value, browserTab]
  browserState.value = {
    ...browserState.value,
    url,
  }
  activateTabById(browserTab.id)
}

function openNewsTab() {
  const existingNewsTab = tabs.value.find((tab): tab is NewsTab => tab.kind === 'news')

  if (existingNewsTab) {
    activateTabById(existingNewsTab.id)
    return
  }

  const newsTab: NewsTab = {
    id: 'news-tab',
    kind: 'news',
    name: 'News',
  }

  tabs.value = [...tabs.value, newsTab]
  activateTabById(newsTab.id)
}

async function openFolder() {
  const folder = await window.fs.openFolder()

  if (!folder) {
    return
  }

  workspaceName.value = folder.rootName
  workspacePath.value = folder.rootPath
  explorerItems.value = folder.entries.map((entry) => ({
    ...entry,
    active: false,
  }))

  const firstFile = folder.entries.find((entry) => entry.kind === 'file')

  tabs.value = tabs.value.filter((tab) => tab.kind === 'browser')
  activeFilePath.value = null
  editorContent.value = defaultEditorContent

  if (firstFile) {
    await openFileByPath(firstFile.path)
  }
}

async function openSingleFile() {
  const file = await window.fs.openFile()

  if (!file) {
    return
  }

  workspaceName.value = workspaceName.value === 'No Folder Opened' ? 'Single File Mode' : workspaceName.value
  workspacePath.value = file.path
  await openFileByPath(file.path)
}

async function handleExplorerSelect(item: ExplorerItem) {
  if (item.kind !== 'file') {
    return
  }

  await openFileByPath(item.path)
}

async function handleTabSelect(tab: WorkbenchTab) {
  activateTabById(tab.id)

  if (tab.kind === 'file') {
    await openFileByPath(tab.path)
  }
}

function handleCloseTab(tab: WorkbenchTab) {
  const closingActive = Boolean(tab.active)
  const closingIndex = tabs.value.findIndex((item) => item.id === tab.id)

  tabs.value = tabs.value.filter((item) => item.id !== tab.id)

  if (tab.kind === 'browser') {
    window.browser.hide()
  }

  if (!closingActive) {
    return
  }

  const nextTab = tabs.value[closingIndex] ?? tabs.value[closingIndex - 1] ?? null

  if (!nextTab) {
    activeFilePath.value = null
    editorContent.value = defaultEditorContent
    return
  }

  void handleTabSelect(nextTab)
}

function handleBrowserNavigate(inputUrl: string) {
  const url = normalizeUrl(inputUrl)

  browserState.value = {
    ...browserState.value,
    url,
  }

  const tab = tabs.value.find((item): item is BrowserTab => item.kind === 'browser')

  if (tab) {
    tab.url = url
  }

  window.browser.navigate(url)
}

function handleActivityItemClick(itemId: string) {
  activeView.value = itemId
  
  statusMessage.value = `${itemId} view`
  
  if (statusMessageTimeout.value) {
    clearTimeout(statusMessageTimeout.value)
  }
  
  statusMessageTimeout.value = window.setTimeout(() => {
    statusMessage.value = ''
    statusMessageTimeout.value = null
  }, 2000)
}

function normalizeUrl(inputUrl: string) {
  if (inputUrl.startsWith('internal://')) {
    return inputUrl
  }

  if (inputUrl.startsWith('http://') || inputUrl.startsWith('https://')) {
    return inputUrl
  }

  return `https://${inputUrl}`
}

function getLanguageFromPath(filePath: string | null) {
  return detectLanguage(filePath)
}

function handleThemeChange(theme: string) {
  currentTheme.value = theme
  document.documentElement.setAttribute('data-theme', theme)
}

function handleProblemsChange(nextProblems: CodeProblem[]) {
  problems.value = nextProblems
}

function handleProblemSelect(problem: CodeProblem) {
  revealTarget.value = {
    line: problem.line,
    column: problem.column,
    nonce: Date.now(),
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function startResize(panel: 'left' | 'right' | 'bottom', event: MouseEvent) {
  event.preventDefault()
  resizingPanel.value = panel
}

function handlePointerMove(event: MouseEvent) {
  if (resizingPanel.value === 'left') {
    leftPanelWidth.value = clamp(event.clientX - 52, 180, 520)
    return
  }

  if (resizingPanel.value === 'right') {
    aiPanelWidth.value = clamp(window.innerWidth - event.clientX, 240, 560)
    return
  }

  if (resizingPanel.value === 'bottom') {
    const windowHeight = window.innerHeight
    const titleBarHeight = 32
    bottomPanelHeight.value = clamp(windowHeight - event.clientY - titleBarHeight, 100, 500)
  }
}

function stopResize() {
  resizingPanel.value = null
}

function openContextMenu(event: MouseEvent) {
  event.preventDefault()
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
  }
  // Send to main process for rickroll easter egg
  window.ipcRenderer.send('right-click-detected')
}

function closeContextMenu() {
  contextMenu.value.visible = false
}

function togglePanel(panel: 'left' | 'ai' | 'bottom') {
  if (panel === 'left') {
    leftPanelVisible.value = !leftPanelVisible.value
  } else if (panel === 'ai') {
    aiPanelVisible.value = !aiPanelVisible.value
  } else {
    bottomPanelVisible.value = !bottomPanelVisible.value
  }

  closeContextMenu()
}

function handlePortClick(port: number) {
  openBrowserTab(`http://localhost:${port}`)
}

onMounted(() => {
  unsubscribeBrowserState = window.browser.onState((state) => {
    browserState.value = state

    const tab = tabs.value.find((item): item is BrowserTab => item.kind === 'browser')

    if (tab) {
      tab.url = state.url || tab.url
      tab.name = state.title || 'Browser'
    }
  })

  unsubscribeSaveFile = window.file.onSave(() => {
    saveActiveFile()
  })

  window.addEventListener('mousemove', handlePointerMove)
  window.addEventListener('mouseup', stopResize)
  window.addEventListener('mousedown', closeContextMenu)
})

onBeforeUnmount(() => {
  unsubscribeBrowserState?.()
  unsubscribeSaveFile?.()
  window.removeEventListener('mousemove', handlePointerMove)
  window.removeEventListener('mouseup', stopResize)
  window.removeEventListener('mousedown', closeContextMenu)
  window.browser.hide()
})
</script>

<template>
  <ErrorScreen v-if="appError" :error="appError" />
  <div v-else class="workbench">
    <TitleBar />
    <div class="main-shell" :style="{ gridTemplateColumns: mainShellGridTemplate }" @contextmenu="openContextMenu">
      <ActivityBar :items="activityItems" :activeItem="activeView" @item-click="handleActivityItemClick" />
      <ExplorerPane
        v-if="leftPanelVisible && activeView === 'explorer'"
        :items="explorerItems"
        :workspace-name="workspaceName"
        @open-folder="openFolder"
        @open-file="openSingleFile"
        @select-item="handleExplorerSelect"
      />
      <SearchPane v-else-if="leftPanelVisible && activeView === 'search'" />
      <SourceControlPane v-else-if="leftPanelVisible && activeView === 'source-control'" />
      <RunDebugPane v-else-if="leftPanelVisible && activeView === 'run'" />
      <ExtensionsPane v-else-if="leftPanelVisible && activeView === 'extensions'" />
      <DebugPane v-else-if="leftPanelVisible && activeView === 'debug'" />
      <ServerPane v-else-if="leftPanelVisible && activeView === 'server'" />
      <SettingsPane v-else-if="leftPanelVisible && activeView === 'settings'" @update:theme="handleThemeChange" />
      <ExplorerPane
        v-else-if="leftPanelVisible"
        :items="explorerItems"
        :workspace-name="workspaceName"
        @open-folder="openFolder"
        @open-file="openSingleFile"
        @select-item="handleExplorerSelect"
      />
      <div v-if="leftPanelVisible" class="panel-resizer" @mousedown="startResize('left', $event)"></div>
      <section class="editor-column" :style="{ gridTemplateRows: editorColumnRows }">
        <EditorTabs :tabs="tabs" @select-tab="handleTabSelect" @close-tab="handleCloseTab" @open-browser="openBrowserTab" />
        <HomeScreen
          v-if="tabs.length === 0"
          @open-folder="openFolder"
          @open-file="openSingleFile"
          @open-news="openNewsTab"
        />
        <EditorPane
          v-else-if="activeTab?.kind === 'file'"
          :code="editorContent"
          :language="activeLanguage"
          :path-label="activeFilePath ?? activeTabName"
          :file-path="activeFilePath"
          :reveal-target="revealTarget"
          @problems-change="handleProblemsChange"
        />
        <BrowserPane
          v-else-if="activeTab?.kind === 'browser'"
          :url="activeBrowserTab?.url ?? browserState.url"
          :state="browserState"
          :visible="true"
          @navigate="handleBrowserNavigate"
        />
        <NewsPane v-else-if="activeTab?.kind === 'news'" />
        <div v-if="bottomPanelVisible" class="panel-resizer panel-resizer-bottom" @mousedown="startResize('bottom', $event)"></div>
        <BottomPanel
          v-if="bottomPanelVisible"
          v-model:activeItem="activeBottomItem"
          :items="bottomItems"
          :problems="problems"
          @select-problem="handleProblemSelect"
          @port-click="handlePortClick"
        />
      </section>
      <div v-if="aiPanelVisible" class="panel-resizer" @mousedown="startResize('right', $event)"></div>
      <AIAgentPanel v-if="aiPanelVisible" />

      <div
        v-if="contextMenu.visible"
        class="app-context-menu"
        :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
        @mousedown.stop
      >
        <button type="button" class="app-context-item" @click="togglePanel('left')">
          {{ leftPanelVisible ? 'Hide Left Panel' : 'Show Left Panel' }}
        </button>
        <button type="button" class="app-context-item" @click="togglePanel('ai')">
          {{ aiPanelVisible ? 'Hide AI Panel' : 'Show AI Panel' }}
        </button>
        <button type="button" class="app-context-item" @click="togglePanel('bottom')">
          {{ bottomPanelVisible ? 'Hide Bottom Panel' : 'Show Bottom Panel' }}
        </button>
        <button type="button" class="app-context-item" @click="openNewsTab">
          Open News Tab
        </button>
      </div>
    </div>
    <StatusBar :items="statusItems" :statusMessage="statusMessage" />
  </div>
</template>

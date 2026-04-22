<script setup lang="ts">
import * as monaco from 'monaco-editor'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { CodeProblem, RevealTarget } from '../types/workbench'

const props = defineProps<{
  code: string
  language: string
  pathLabel: string
  filePath: string | null
  revealTarget: RevealTarget | null
}>()

const emit = defineEmits<{
  'problems-change': [problems: CodeProblem[]]
}>()

const editorRoot = ref<HTMLElement | null>(null)
let editor: monaco.editor.IStandaloneCodeEditor | null = null
let model: monaco.editor.ITextModel | null = null

let resizeObserver: ResizeObserver | null = null
let themeObserver: MutationObserver | null = null
let markerListener: monaco.IDisposable | null = null

function getMonacoTheme() {
  const theme = document.documentElement.getAttribute('data-theme')
  return theme === 'light' ? 'vs' : 'vs-dark'
}

function updateTheme() {
  if (editor) {
    monaco.editor.setTheme(getMonacoTheme())
  }
}

function severityFromMarker(severity: monaco.MarkerSeverity): CodeProblem['severity'] {
  if (severity === monaco.MarkerSeverity.Error) return 'error'
  if (severity === monaco.MarkerSeverity.Warning) return 'warning'
  if (severity === monaco.MarkerSeverity.Info) return 'info'
  return 'hint'
}

function syncProblems() {
  if (!model || !props.filePath) {
    emit('problems-change', [])
    return
  }

  const markers = monaco.editor.getModelMarkers({ resource: model.uri })
  const problems: CodeProblem[] = markers.map((marker) => ({
    message: marker.message,
    severity: severityFromMarker(marker.severity),
    line: marker.startLineNumber,
    column: marker.startColumn,
    source: marker.source,
  }))

  emit('problems-change', problems)
}

onMounted(() => {
  if (!editorRoot.value) {
    return
  }

  model = monaco.editor.createModel(props.code, props.language)
  editor = monaco.editor.create(editorRoot.value, {
    model,
    theme: getMonacoTheme(),
    automaticLayout: true,
    minimap: { enabled: true },
    scrollbar: {
      vertical: 'auto',
      horizontal: 'auto',
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
      useShadows: false,
    },
    fontSize: 14,
    lineHeight: 22,
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    tabSize: 2,
    wordWrap: 'on',
    readOnly: false,
    padding: {
      top: 16,
      bottom: 24,
    },
  })

  resizeObserver = new ResizeObserver(() => {
    editor?.layout()
  })
  resizeObserver.observe(editorRoot.value)

  themeObserver = new MutationObserver(updateTheme)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

  markerListener = monaco.editor.onDidChangeMarkers(() => {
    syncProblems()
  })

  syncProblems()
})

watch(
  () => [props.code, props.language] as const,
  ([code, language]) => {
    if (!model) {
      return
    }

    model.setValue(code)
    monaco.editor.setModelLanguage(model, language)
    syncProblems()
  },
)

watch(
  () => props.filePath,
  () => {
    syncProblems()
  },
)

watch(
  () => props.revealTarget,
  (target) => {
    if (!target || !editor) {
      return
    }

    editor.revealPositionInCenter({ lineNumber: target.line, column: target.column })
    editor.setPosition({ lineNumber: target.line, column: target.column })
    editor.focus()
  },
)

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  themeObserver?.disconnect()
  markerListener?.dispose()
  editor?.dispose()
  model?.dispose()
})
</script>

<template>
  <section class="editor-pane">
    <div class="editor-breadcrumb">{{ pathLabel }}</div>
    <div class="editor-root" ref="editorRoot"></div>
  </section>
</template>

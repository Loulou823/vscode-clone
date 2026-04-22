/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

// Used in Renderer process, expose in `preload.ts`
interface Window {
  ipcRenderer: import('electron').IpcRenderer
  appWindow: {
    minimize: () => void
    toggleMaximize: () => void
    close: () => void
    openAppMenu: (coordinates?: { x: number; y: number }) => void
  }
  fs: {
    openFolder: () => Promise<{
      rootName: string
      rootPath: string
      entries: Array<{
        name: string
        path: string
        kind: 'file' | 'directory'
        depth: number
      }>
    } | null>
    openFile: () => Promise<{
      name: string
      path: string
      content: string
    } | null>
    readFile: (filePath: string) => Promise<{
      name: string
      path: string
      content: string
    }>
  }
  terminal: {
    start: () => Promise<boolean>
    write: (input: string) => void
    onData: (listener: (data: string) => void) => () => void
    onExit: (listener: (code: number) => void) => () => void
  }
  browser: {
    show: (url: string, bounds: { x: number; y: number; width: number; height: number }) => Promise<boolean>
    updateBounds: (bounds: { x: number; y: number; width: number; height: number }) => void
    hide: () => void
    navigate: (url: string) => void
    back: () => void
    forward: () => void
    reload: () => void
    onState: (listener: (state: {
      url: string
      title: string
      canGoBack: boolean
      canGoForward: boolean
      loading: boolean
    }) => void) => () => void
  }
  file: {
    save: (options: { filePath: string; content: string }) => Promise<{ success: boolean; error?: string }>
    onSave: (listener: () => void) => () => void
  }
  ai: {
    chat: (options: {
      provider: 'chatgpt' | 'claude' | 'gemini'
      apiKey: string
      prompt: string
      history: Array<{ role: 'user' | 'assistant'; text: string }>
    }) => Promise<{ success: boolean; response?: string; error?: string }>
  }
  news: {
    fetch: () => Promise<{ success: boolean; data?: unknown; error?: string }>
  }
}

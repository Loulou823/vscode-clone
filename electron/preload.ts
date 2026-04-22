import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})

contextBridge.exposeInMainWorld('appWindow', {
  minimize() {
    ipcRenderer.send('window:minimize')
  },
  toggleMaximize() {
    ipcRenderer.send('window:toggle-maximize')
  },
  close() {
    ipcRenderer.send('window:close')
  },
  openAppMenu(coordinates?: { x: number; y: number }) {
    ipcRenderer.send('menu:open-app-menu', coordinates)
  },
})

contextBridge.exposeInMainWorld('fs', {
  openFolder() {
    return ipcRenderer.invoke('fs:open-folder')
  },
  openFile() {
    return ipcRenderer.invoke('fs:open-file')
  },
  readFile(filePath: string) {
    return ipcRenderer.invoke('fs:read-file', filePath)
  },
})

contextBridge.exposeInMainWorld('terminal', {
  start() {
    return ipcRenderer.invoke('terminal:start')
  },
  write(input: string) {
    ipcRenderer.send('terminal:input', input)
  },
  onData(listener: (data: string) => void) {
    const wrappedListener = (_event: Electron.IpcRendererEvent, data: string) => listener(data)
    ipcRenderer.on('terminal:data', wrappedListener)

    return () => ipcRenderer.off('terminal:data', wrappedListener)
  },
  onExit(listener: (code: number) => void) {
    const wrappedListener = (_event: Electron.IpcRendererEvent, code: number) => listener(code)
    ipcRenderer.on('terminal:exit', wrappedListener)

    return () => ipcRenderer.off('terminal:exit', wrappedListener)
  },
})

contextBridge.exposeInMainWorld('browser', {
  show(url: string, bounds: { x: number; y: number; width: number; height: number }) {
    return ipcRenderer.invoke('browser:show', { url, bounds })
  },
  updateBounds(bounds: { x: number; y: number; width: number; height: number }) {
    ipcRenderer.send('browser:update-bounds', bounds)
  },
  hide() {
    ipcRenderer.send('browser:hide')
  },
  navigate(url: string) {
    ipcRenderer.send('browser:navigate', url)
  },
  back() {
    ipcRenderer.send('browser:back')
  },
  forward() {
    ipcRenderer.send('browser:forward')
  },
  reload() {
    ipcRenderer.send('browser:reload')
  },
  onState(listener: (state: {
    url: string
    title: string
    canGoBack: boolean
    canGoForward: boolean
    loading: boolean
  }) => void) {
    const wrappedListener = (_event: Electron.IpcRendererEvent, state: {
      url: string
      title: string
      canGoBack: boolean
      canGoForward: boolean
      loading: boolean
    }) => listener(state)
    ipcRenderer.on('browser:state', wrappedListener)

return () => ipcRenderer.off('browser:state', wrappedListener)
  },
})

contextBridge.exposeInMainWorld('server', {
  start(options: { port: number; rootPath: string }) {
    return ipcRenderer.invoke('server:start', options)
  },
  stop(port: number) {
    return ipcRenderer.invoke('server:stop', port)
  },
})

contextBridge.exposeInMainWorld('ports', {
  list() {
    return ipcRenderer.invoke('ports:list')
  },
})

contextBridge.exposeInMainWorld('file', {
  save(options: { filePath: string; content: string }) {
    return ipcRenderer.invoke('file:save', options)
  },
  onSave(listener: () => void) {
    const wrappedListener = () => listener()
    ipcRenderer.on('menu:save-file', wrappedListener)

    return () => ipcRenderer.off('menu:save-file', wrappedListener)
  },
})

contextBridge.exposeInMainWorld('ai', {
  chat(options: {
    provider: 'chatgpt' | 'claude' | 'gemini'
    apiKey: string
    prompt: string
    history: Array<{ role: 'user' | 'assistant'; text: string }>
  }) {
    return ipcRenderer.invoke('ai:chat', options)
  },
  chatStream(options: {
    provider: 'chatgpt' | 'claude' | 'gemini'
    apiKey: string
    prompt: string
    history: Array<{ role: 'user' | 'assistant'; text: string }>
    onChunk: (chunk: { content: string }) => void
    onComplete: (result: { success: boolean; response?: string; error?: string }) => void
  }) {
    // Only send serializable data through IPC
    ipcRenderer.send('ai:chat:stream', {
      provider: options.provider,
      apiKey: options.apiKey,
      prompt: options.prompt,
      history: options.history,
    })

    const chunkListener = (_event: Electron.IpcRendererEvent, chunk: { content: string }) => {
      options.onChunk(chunk)
    }

    const completeListener = (_event: Electron.IpcRendererEvent, result: { success: boolean; response?: string; error?: string }) => {
      options.onComplete(result)
      ipcRenderer.removeListener('ai:chat:chunk', chunkListener)
      ipcRenderer.removeListener('ai:chat:complete', completeListener)
    }

    ipcRenderer.on('ai:chat:chunk', chunkListener)
    ipcRenderer.on('ai:chat:complete', completeListener)

    return () => {
      ipcRenderer.removeListener('ai:chat:chunk', chunkListener)
      ipcRenderer.removeListener('ai:chat:complete', completeListener)
    }
  },
  fs: {
    listDirectory(dirPath: string) {
      return ipcRenderer.invoke('ai:fs:list-directory', dirPath)
    },
    readFile(filePath: string) {
      return ipcRenderer.invoke('ai:fs:read-file', filePath)
    },
  },
})

contextBridge.exposeInMainWorld('news', {
  fetch() {
    return ipcRenderer.invoke('news:fetch')
  },
})

contextBridge.exposeInMainWorld('apiKeys', {
  get() {
    return ipcRenderer.invoke('api-keys:get')
  },
})

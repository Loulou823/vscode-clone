/// <reference types="vite/client" />

interface ServerResult {
  success: boolean
  port?: number
  error?: string
}

interface ServerAPI {
  start(options: { port: number; rootPath: string }): Promise<ServerResult>
  stop(port: number): Promise<ServerResult>
}

interface FileAPI {
  save(options: { filePath: string; content: string }): Promise<{ success: boolean; error?: string }>
}

interface FileSystemAPI {
  openFolder(): Promise<{ rootName: string; rootPath: string; entries: Array<{ name: string; path: string; kind: 'file' | 'directory' }> } | null>
  openFile(): Promise<{ name: string; path: string; content: string } | null>
  readFile(filePath: string): Promise<{ name: string; path: string; content: string }>
}

interface AIApi {
  chat(options: {
    provider: 'chatgpt' | 'claude' | 'gemini'
    apiKey: string
    prompt: string
    history: Array<{ role: 'user' | 'assistant'; text: string }>
  }): Promise<{ success: boolean; response?: string; error?: string }>
  chatStream(options: {
    provider: 'chatgpt' | 'claude' | 'gemini'
    apiKey: string
    prompt: string
    history: Array<{ role: 'user' | 'assistant'; text: string }>
    onChunk: (chunk: { content: string }) => void
    onComplete: (result: { success: boolean; response?: string; error?: string }) => void
  }): () => void
  fs: {
    listDirectory(dirPath: string): Promise<{ success: boolean; entries?: Array<{ name: string; path: string; kind: 'file' | 'directory' }>; error?: string }>
    readFile(filePath: string): Promise<{ success: boolean; content?: string; error?: string }>
  }
}

interface NewsApi {
  fetch(): Promise<{ success: boolean; data?: unknown; error?: string }>
}

interface PortInfo {
  port: number
  process: string
  pid?: number
  type: 'app' | 'system'
}

interface PortsAPI {
  list(): Promise<{ success: boolean; ports?: PortInfo[]; error?: string }>
}

interface ApiKeys {
  gemini: string
  chatgpt: string
  claude: string
  mistral: string
}

interface ApiKeysAPI {
  get(): Promise<{ success: boolean; keys?: ApiKeys; error?: string }>
}

declare global {
  interface Window {
    server: ServerAPI
    file: FileAPI
    fs: FileSystemAPI
    ai: AIApi
    news: NewsApi
    ports: PortsAPI
    apiKeys: ApiKeysAPI
  }
}

export {}

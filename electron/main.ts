import { app, BrowserView, BrowserWindow, dialog, ipcMain, Menu, type BrowserWindowConstructorOptions, type IpcMainEvent, type IpcMainInvokeEvent, type WebContents } from 'electron'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load environment variables from aiproviders.env
const envPath = path.join(process.env.APP_ROOT || __dirname, '..', 'src', 'aiproviders.env')
dotenv.config({ path: envPath })

type FsEntry = {
  name: string
  path: string
  kind: 'file' | 'directory'
  depth: number
}

type FilePayload = {
  name: string
  path: string
  content: string
}

type BrowserViewState = {
  url: string
  title: string
  canGoBack: boolean
  canGoForward: boolean
  loading: boolean
}

type BrowserBounds = {
  x: number
  y: number
  width: number
  height: number
}

type TerminalSession = {
  process: ChildProcessWithoutNullStreams
}

type AIProvider = 'chatgpt' | 'claude' | 'gemini' | 'mistral'

type AIMessage = {
  role: 'user' | 'assistant'
  text: string
}

type AIChatPayload = {
  provider: AIProvider
  apiKey: string
  prompt: string
  history: AIMessage[]
}

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

if (process.platform !== 'win32') {
  throw new Error('This application is only supported on Windows.')
}

let win: BrowserWindow | null
const browserViews = new Map<number, BrowserView>()
const browserViewUrls = new Map<number, string>()
const terminalSessions = new Map<number, TerminalSession>()
const serverInstances = new Map<number, { server: Server; port: number }>()

// Rickroll easter egg tracking
let rightClickPressed = false
let ctrlPressCount = 0
let ctrlPressTimeout: NodeJS.Timeout | null = null

function isHttpUrl(targetUrl: string) {
  return targetUrl.startsWith('http://') || targetUrl.startsWith('https://')
}

function isHttpsUrl(targetUrl: string) {
  return targetUrl.startsWith('https://')
}

function isInternalBrowserUrl(targetUrl: string) {
  return targetUrl.startsWith('internal://')
}

function normalizeInternalPath(targetUrl: string) {
  const pathPart = targetUrl.slice('internal://'.length).split('?')[0].split('#')[0]
  return pathPart.replace(/^\/+/, '').toLowerCase() || 'home'
}

function buildRickrollHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Rickroll!</title>
    <style>
      :root { color-scheme: dark; }
      body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #1e1e1e; }
      .wrapper { width: 100%; max-width: 800px; }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
    </div>
  </body>
</html>`
}

function buildInternalPageHtml(targetUrl: string) {
  const page = normalizeInternalPath(targetUrl)

  const pages: Record<string, { title: string; heading: string; body: string }> = {
    home: {
      title: 'Internal Home',
      heading: 'Integrated Browser Home',
      body: '<p>Use internal pages for quick links and editor help.</p>',
    },
    docs: {
      title: 'Internal Docs',
      heading: 'Internal Documentation',
      body: '<p>This page is bundled in the editor and loads without internet access.</p>',
    },
    shortcuts: {
      title: 'Keyboard Shortcuts',
      heading: 'Common Shortcuts',
      body: '<ul><li><strong>Ctrl+S</strong> Save active file</li><li><strong>Ctrl+W</strong> Close active tab</li><li><strong>Ctrl+Shift+I</strong> Toggle dev tools</li></ul>',
    },
  }

  const selectedPage = pages[page] ?? {
    title: 'Page Not Found',
    heading: 'Internal page not found',
    body: `<p>The page <code>${page}</code> does not exist. Try <code>internal://home</code>.</p>`,
  }

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${selectedPage.title}</title>
    <style>
      :root { color-scheme: dark; }
      body { margin: 0; font-family: Segoe UI, sans-serif; background: #1e1e1e; color: #e6e6e6; }
      .wrapper { max-width: 860px; margin: 24px auto; padding: 0 20px; }
      nav { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
      a { color: #9cdcfe; text-decoration: none; border: 1px solid #3c3c3c; border-radius: 6px; padding: 6px 10px; }
      a:hover { background: #2a2d2e; }
      .card { border: 1px solid #3c3c3c; border-radius: 10px; padding: 16px; background: #252526; }
      code { background: #111; border-radius: 4px; padding: 1px 4px; }
    </style>
  </head>
  <body>
    <main class="wrapper">
      <nav>
        <a href="internal://home">Home</a>
        <a href="internal://docs">Docs</a>
        <a href="internal://shortcuts">Shortcuts</a>
        <a href="https://example.com">External Demo</a>
      </nav>
      <section class="card">
        <h1>${selectedPage.heading}</h1>
        ${selectedPage.body}
      </section>
    </main>
  </body>
</html>`
}

function resolveBrowserTargetUrl(targetUrl: string) {
  if (isInternalBrowserUrl(targetUrl)) {
    const html = buildInternalPageHtml(targetUrl)
    return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
  }

  return targetUrl
}

function getWindowFromSender(sender: WebContents) {
  return BrowserWindow.fromWebContents(sender)
}

function isWindowsBelow20H2() {
  if (process.platform !== 'win32') {
    return false
  }

  const release = os.release()
  const parts = release.split('.').map((part) => Number(part))
  const buildNumber = parts[2] ?? 0

  // Windows 10 20H2 maps to build 19042.
  return buildNumber > 0 && buildNumber < 19042
}

function normalizeAiMessages(history: AIMessage[], prompt: string): AIMessage[] {
  const sanitizedHistory = history
    .filter((item) => item.text.trim().length > 0)
    .slice(-20)
    .map((item) => ({
      role: item.role,
      text: item.text.trim(),
    }))

  sanitizedHistory.push({ role: 'user', text: prompt.trim() })

  return sanitizedHistory
}

async function parseJsonResponse(response: Response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function requestWithModelFallback<T>(
  models: string[],
  request: (model: string) => Promise<T>,
) {
  let lastError: unknown = null

  for (const model of models) {
    try {
      return await request(model)
    } catch (err) {
      lastError = err
    }
  }

  throw lastError instanceof Error ? lastError : new Error('All model fallbacks failed.')
}

async function requestOpenAI(apiKey: string, messages: AIMessage[], event?: IpcMainEvent) {
  const preferredModels = ['gpt-5.4-mini', 'gpt-5.4', 'gpt-4o-mini']

  return requestWithModelFallback(preferredModels, async (model) => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: messages.map((message) => ({
          role: message.role,
          content: message.text,
        })),
        temperature: 0.3,
        stream: event ? true : false,
      }),
    })

    if (!response.ok) {
      const data = await parseJsonResponse(response)
      const message = data?.error?.message || `OpenAI request failed (${response.status})`
      throw new Error(message)
    }

    if (event) {
      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Failed to get response reader')
      }

      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter((line) => line.trim() !== '')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content
              if (content) {
                fullText += content
                event.sender.send('ai:chat:chunk', { content })
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      return fullText
    }

    // Non-streaming response
    const data = await parseJsonResponse(response)
    const text = data?.choices?.[0]?.message?.content
    if (!text) {
      throw new Error(`OpenAI (${model}) returned an empty response.`)
    }

    return text as string
  })
}

async function requestClaude(apiKey: string, messages: AIMessage[], event?: IpcMainEvent) {
  const preferredModels = ['claude-sonnet-4-5', 'claude-opus-4-7', 'claude-3-5-sonnet-latest']

  return requestWithModelFallback(preferredModels, async (model) => {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: messages.map((message) => ({
          role: message.role === 'assistant' ? 'assistant' : 'user',
          content: message.text,
        })),
        stream: event ? true : false,
      }),
    })

    if (!response.ok) {
      const data = await parseJsonResponse(response)
      const message = data?.error?.message || `Claude request failed (${response.status})`
      throw new Error(message)
    }

    if (event) {
      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Failed to get response reader')
      }

      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter((line) => line.trim() !== '')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const delta = parsed.delta
              if (delta?.type === 'content_block_delta' && delta?.delta?.type === 'text_delta') {
                const content = delta.delta.text
                fullText += content
                event.sender.send('ai:chat:chunk', { content })
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      return fullText
    }

    // Non-streaming response
    const data = await parseJsonResponse(response)
    const parts = Array.isArray(data?.content) ? data.content : []
    const text = parts
      .filter((part: { type?: string; text?: string }) => part.type === 'text' && typeof part.text === 'string')
      .map((part: { text?: string }) => part.text)
      .join('\n')
      .trim()

    if (!text) {
      throw new Error(`Claude (${model}) returned an empty response.`)
    }

    return text
  })
}

async function requestMistral(apiKey: string, messages: AIMessage[], event?: IpcMainEvent) {
  const preferredModels = ['mistral-small-latest', 'mistral-medium-latest', 'mistral-large-latest']

  return requestWithModelFallback(preferredModels, async (model) => {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: messages.map((message) => ({
          role: message.role,
          content: message.text,
        })),
        temperature: 0.3,
        stream: event ? true : false,
      }),
    })

    if (!response.ok) {
      const data = await parseJsonResponse(response)
      const message = data?.error?.message || `Mistral request failed (${response.status})`
      throw new Error(message)
    }

    if (event) {
      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Failed to get response reader')
      }

      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter((line) => line.trim() !== '')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const text = parsed.choices?.[0]?.delta?.content
              if (text) {
                fullText += text
                event.sender.send('ai:chat:chunk', { content: text })
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      return fullText
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
  })
}

async function requestGemini(apiKey: string, messages: AIMessage[], event?: IpcMainEvent) {
  const preferredModels = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-1.5-flash']

  return requestWithModelFallback(preferredModels, async (model) => {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?key=${encodeURIComponent(apiKey)}`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: messages.map((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.text }],
        })),
        generationConfig: {
          temperature: 0.3,
        },
      }),
    })

    if (!response.ok) {
      const data = await parseJsonResponse(response)
      const message = data?.error?.message || `Gemini request failed (${response.status})`
      throw new Error(message)
    }

    if (event) {
      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Failed to get response reader')
      }

      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter((line) => line.trim() !== '')

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line)
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text
            if (text) {
              fullText += text
              event.sender.send('ai:chat:chunk', { content: text })
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }

      return fullText
    }

    // Non-streaming response (fallback to non-streaming endpoint)
    const nonStreamEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
    const nonStreamResponse = await fetch(nonStreamEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: messages.map((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.text }],
        })),
        generationConfig: {
          temperature: 0.3,
        },
      }),
    })

    const data = await parseJsonResponse(nonStreamResponse)

    if (!nonStreamResponse.ok) {
      const message = data?.error?.message || `Gemini request failed (${nonStreamResponse.status})`
      throw new Error(message)
    }

    const text = data?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? '')
      .join('\n')
      .trim()

    if (!text) {
      throw new Error(`Gemini (${model}) returned an empty response.`)
    }

    return text
  })
}

async function requestAIResponse(payload: AIChatPayload, event?: IpcMainEvent) {
  const prompt = payload.prompt.trim()
  const apiKey = payload.apiKey.trim()

  if (!prompt) {
    throw new Error('Prompt cannot be empty.')
  }

  if (!apiKey) {
    throw new Error(`Missing API key for ${payload.provider}.`)
  }

  const messages = normalizeAiMessages(payload.history, prompt)

  if (payload.provider === 'chatgpt') {
    return requestOpenAI(apiKey, messages, event)
  }

  if (payload.provider === 'claude') {
    return requestClaude(apiKey, messages, event)
  }

  if (payload.provider === 'mistral') {
    return requestMistral(apiKey, messages, event)
  }

  return requestGemini(apiKey, messages, event)
}

function getShellCommand() {
  if (process.platform === 'win32') {
    return {
      command: 'powershell.exe',
      args: ['-NoLogo'],
    }
  }

  return {
    command: 'bash',
    args: [],
  }
}

function createBrowserWindow(options?: BrowserWindowConstructorOptions) {
  const browserWindow = new BrowserWindow({
    backgroundColor: '#1e1e1e',
    icon: path.join(process.env.APP_ROOT, 'build', 'app-icon.png'),
    ...options,
  })

  browserWindow.removeMenu()

  return browserWindow
}

function openWebsiteWindow(targetUrl: string) {
  const websiteWindow = createBrowserWindow({
    autoHideMenuBar: true,
    minWidth: 980,
    minHeight: 640,
  })

  websiteWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isHttpsUrl(url)) {
      openWebsiteWindow(url)
      return { action: 'deny' }
    }

    return { action: 'allow' }
  })

  websiteWindow.webContents.on('will-navigate', (event, url) => {
    if (!isHttpUrl(url)) {
      return
    }

    if (isHttpsUrl(url)) {
      return
    }

    event.preventDefault()
  })

  websiteWindow.loadURL(targetUrl)

  return websiteWindow
}

function openRickrollWindow() {
  const rickrollWindow = createBrowserWindow({
    autoHideMenuBar: true,
    width: 640,
    height: 480,
    resizable: false,
  })

  const html = buildRickrollHtml()
  rickrollWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

  return rickrollWindow
}

function sendBrowserState(window: BrowserWindow, view: BrowserView) {
  if (window.isDestroyed() || view.webContents.isDestroyed()) {
    return
  }

  const state: BrowserViewState = {
    url: browserViewUrls.get(window.webContents.id) ?? view.webContents.getURL(),
    title: view.webContents.getTitle(),
    canGoBack: false,
    canGoForward: false,
    loading: view.webContents.isLoading(),
  }

  window.webContents.send('browser:state', state)
}

function getOrCreateBrowserView(window: BrowserWindow) {
  const windowId = window.webContents.id
  const existingView = browserViews.get(windowId)

  if (existingView) {
    return existingView
  }

  const view = new BrowserView({
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
    },
  })

  const syncState = () => sendBrowserState(window, view)

  view.webContents.setWindowOpenHandler(({ url }) => {
    if (isInternalBrowserUrl(url)) {
      void view.webContents.loadURL(resolveBrowserTargetUrl(url))
      browserViewUrls.set(windowId, url)
      sendBrowserState(window, view)
      return { action: 'deny' }
    }

    if (isHttpsUrl(url)) {
      openWebsiteWindow(url)
      return { action: 'deny' }
    }

    return { action: 'deny' }
  })

  view.webContents.on('will-navigate', (event, url) => {
    if (!isInternalBrowserUrl(url)) {
      return
    }

    event.preventDefault()
    void view.webContents.loadURL(resolveBrowserTargetUrl(url))
    browserViewUrls.set(windowId, url)
    sendBrowserState(window, view)
  })

  view.webContents.on('page-title-updated', syncState)
  view.webContents.on('did-navigate', syncState)
  view.webContents.on('did-navigate-in-page', syncState)
  view.webContents.on('did-finish-load', syncState)
  view.webContents.on('did-start-loading', syncState)
  view.webContents.on('did-stop-loading', syncState)

  browserViews.set(windowId, view)

  return view
}

function showBrowserView(window: BrowserWindow, bounds: BrowserBounds, url?: string) {
  if (window.isDestroyed()) {
    return
  }

  const view = getOrCreateBrowserView(window)

  if (!window.getBrowserViews().includes(view)) {
    window.addBrowserView(view)
  }

  view.setBounds(bounds)

  if (url) {
    const nextTarget = resolveBrowserTargetUrl(url)
    const currentUrl = browserViewUrls.get(window.webContents.id) ?? view.webContents.getURL()

    if (currentUrl !== url) {
      browserViewUrls.set(window.webContents.id, url)
      void view.webContents.loadURL(nextTarget)
    }
  }

  sendBrowserState(window, view)
}

function hideBrowserView(window: BrowserWindow) {
  const view = browserViews.get(window.webContents.id)

  if (!view) {
    return
  }

  if (window.getBrowserViews().includes(view)) {
    window.removeBrowserView(view)
  }
}

function destroyBrowserView(window: BrowserWindow) {
  if (!window || window.isDestroyed()) {
    return
  }
  
  const view = browserViews.get(window.webContents.id)

  if (!view) {
    return
  }

  hideBrowserView(window)
  browserViews.delete(window.webContents.id)
  browserViewUrls.delete(window.webContents.id)

  if (!view.webContents.isDestroyed()) {
    view.webContents.close()
  }
}

function getOrCreateTerminalSession(window: BrowserWindow) {
  const windowId = window.webContents.id
  const existingSession = terminalSessions.get(windowId)

  if (existingSession) {
    return existingSession
  }

  const shell = getShellCommand()
  const terminalProcess = spawn(shell.command, shell.args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'pipe',
  })

  const session = { process: terminalProcess }

  terminalProcess.stdout.on('data', (chunk) => {
    if (!window.isDestroyed()) {
      window.webContents.send('terminal:data', chunk.toString())
    }
  })

  terminalProcess.stderr.on('data', (chunk) => {
    if (!window.isDestroyed()) {
      window.webContents.send('terminal:data', chunk.toString())
    }
  })

  terminalProcess.on('close', (code) => {
    terminalSessions.delete(windowId)
    if (!window.isDestroyed()) {
      window.webContents.send('terminal:exit', code ?? 0)
    }
  })

  terminalSessions.set(windowId, session)

  return session
}

function disposeTerminalSession(window: BrowserWindow) {
  if (!window || window.isDestroyed()) {
    return
  }
  
  const session = terminalSessions.get(window.webContents.id)

  if (!session) {
    return
  }

  terminalSessions.delete(window.webContents.id)
  session.process.kill()
}

function shouldSkipEntry(name: string) {
  return ['.git', 'dist', 'dist-electron', 'node_modules', 'release'].includes(name)
}

async function readDirectoryTree(rootPath: string) {
  const items: FsEntry[] = []

  async function walk(currentPath: string, depth: number) {
    const entries = await readdir(currentPath, { withFileTypes: true })
    const sortedEntries = entries
      .filter((entry) => !shouldSkipEntry(entry.name))
      .sort((left, right) => {
        if (left.isDirectory() !== right.isDirectory()) {
          return left.isDirectory() ? -1 : 1
        }

        return left.name.localeCompare(right.name)
      })

    for (const entry of sortedEntries) {
      const entryPath = path.join(currentPath, entry.name)
      const kind = entry.isDirectory() ? 'directory' : 'file'

      items.push({
        name: entry.name,
        path: entryPath,
        kind,
        depth,
      })

      if (entry.isDirectory()) {
        await walk(entryPath, depth + 1)
      }
    }
  }

  await walk(rootPath, 0)

  return items
}

async function readFilePayload(filePath: string): Promise<FilePayload> {
  const content = await readFile(filePath, 'utf8')

  return {
    name: path.basename(filePath),
    path: filePath,
    content,
  }
}

function buildAppMenu(window: BrowserWindow) {
  return Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          label: 'New Window',
          click: () => createWindow(),
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: (_, browserWindow) => {
            browserWindow?.webContents.send('menu:save-file')
          },
        },
        { type: 'separator' },
        { role: 'reload', label: 'Reload' },
        { role: 'forceReload', label: 'Force Reload' },
        { type: 'separator' },
        { role: 'close', label: 'Close Window' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom', label: 'Actual Size' },
        { role: 'zoomIn', label: 'Zoom In' },
        { role: 'zoomOut', label: 'Zoom Out' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Toggle Full Screen' },
        { role: 'toggleDevTools', label: 'Toggle DevTools' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { role: 'front' },
      ],
    },
    {
      label: 'Developer',
      submenu: [
        {
          label: 'Inspect Element',
          click: () => window.webContents.inspectElement(0, 0),
        },
        { role: 'toggleDevTools', label: 'Developer Tools' },
      ],
    },
  ])
}

function registerIpc() {
  ipcMain.on('right-click-detected', () => {
    rightClickPressed = true
    ctrlPressCount = 0

    if (ctrlPressTimeout) {
      clearTimeout(ctrlPressTimeout)
    }

    ctrlPressTimeout = setTimeout(() => {
      rightClickPressed = false
      ctrlPressCount = 0
    }, 2000)
  })

  ipcMain.on('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.on('window:toggle-maximize', (event) => {
    const target = BrowserWindow.fromWebContents(event.sender)

    if (!target) {
      return
    }

    if (target.isMaximized()) {
      target.unmaximize()
      return
    }

    target.maximize()
  })

  ipcMain.on('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  ipcMain.on('menu:open-app-menu', (event, coordinates?: { x?: number; y?: number }) => {
    const target = BrowserWindow.fromWebContents(event.sender)

    if (!target) {
      return
    }

    const menu = buildAppMenu(target)
    menu.popup({
      window: target,
      x: typeof coordinates?.x === 'number' ? Math.round(coordinates.x) : undefined,
      y: typeof coordinates?.y === 'number' ? Math.round(coordinates.y) : undefined,
    })
  })

  ipcMain.handle('fs:open-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const rootPath = result.filePaths[0]

    return {
      rootName: path.basename(rootPath),
      rootPath,
      entries: await readDirectoryTree(rootPath),
    }
  })

  ipcMain.handle('fs:open-file', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return readFilePayload(result.filePaths[0])
  })

  ipcMain.handle('fs:read-file', async (_event, filePath: string) => {
    return readFilePayload(filePath)
  })

  ipcMain.handle('ai:fs:list-directory', async (_event, dirPath: string) => {
    try {
      if (!existsSync(dirPath)) {
        return { success: false, error: 'Directory does not exist' }
      }

      const entries = await readDirectoryTree(dirPath)
      return { success: true, entries }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('ai:fs:read-file', async (_event, filePath: string) => {
    try {
      if (!existsSync(filePath)) {
        return { success: false, error: 'File does not exist' }
      }

      const content = await readFile(filePath, 'utf8')
      return { success: true, content }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('terminal:start', (event: IpcMainInvokeEvent) => {
    const target = getWindowFromSender(event.sender)

    if (!target) {
      return false
    }

    getOrCreateTerminalSession(target)
    return true
  })

ipcMain.on('terminal:input', (event: IpcMainEvent, input: string) => {
  const target = getWindowFromSender(event.sender)

  if (!target || target.isDestroyed()) {
    return
  }

  const session = getOrCreateTerminalSession(target)
  session.process.stdin.write(input)
})

  ipcMain.handle('browser:show', async (event: IpcMainInvokeEvent, payload: { bounds: BrowserBounds; url: string }) => {
    const target = getWindowFromSender(event.sender)

    if (!target) {
      return null
    }

    showBrowserView(target, payload.bounds, payload.url)
    return true
  })

ipcMain.on('browser:update-bounds', (event: IpcMainEvent, bounds: BrowserBounds) => {
  const target = getWindowFromSender(event.sender)

  if (!target || target.isDestroyed()) {
    return
  }

  const view = browserViews.get(target.webContents.id)

  if (!view) {
    return
  }

  view.setBounds(bounds)
})

  ipcMain.on('browser:hide', (event: IpcMainEvent) => {
    const target = getWindowFromSender(event.sender)

    if (!target) {
      return
    }

    hideBrowserView(target)
  })

ipcMain.on('browser:navigate', (event: IpcMainEvent, url: string) => {
  const target = getWindowFromSender(event.sender)

  if (!target || target.isDestroyed()) {
    return
  }

  const view = getOrCreateBrowserView(target)
  browserViewUrls.set(target.webContents.id, url)
  void view.webContents.loadURL(resolveBrowserTargetUrl(url))
})

ipcMain.on('browser:back', (event: IpcMainEvent) => {
    const target = getWindowFromSender(event.sender)
    const view = target ? browserViews.get(target.webContents.id) : undefined

    if (view) {
      view.webContents.goBack()
    }
  })

  ipcMain.on('browser:forward', (event: IpcMainEvent) => {
    const target = getWindowFromSender(event.sender)
    const view = target ? browserViews.get(target.webContents.id) : undefined

    if (view) {
      view.webContents.goForward()
    }
  })

ipcMain.on('browser:reload', (event: IpcMainEvent) => {
  const target = getWindowFromSender(event.sender)
  const view = target ? browserViews.get(target.webContents.id) : undefined

  view?.webContents.reload()
})

ipcMain.handle('server:start', async (_event, options: { port: number; rootPath: string }) => {
  const { port, rootPath } = options

  const existing = serverInstances.get(port)
  if (existing) {
    return { success: false, error: 'Port already in use', port }
  }

  if (!existsSync(rootPath)) {
    await mkdir(rootPath, { recursive: true })
  }

  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const urlPath = req.url || '/'
      const filePath = path.join(rootPath, urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, ''))

      if (existsSync(filePath)) {
        const content = readFileSync(filePath)
        const ext = path.extname(filePath)
        const contentType = ext === '.html' ? 'text/html' : ext === '.js' ? 'application/javascript' : ext === '.css' ? 'text/css' : 'text/plain'
        res.writeHead(200, { 'Content-Type': contentType })
        res.end(content)
      } else {
        res.writeHead(404)
        res.end('Not Found')
      }
    })

    server.listen(port, () => {
      serverInstances.set(port, { server, port })
      resolve({ success: true, port })
    })

    server.on('error', (err) => {
      resolve({ success: false, error: err.message, port })
    })
  })
})

ipcMain.handle('server:stop', async (_event, port: number) => {
  const instance = serverInstances.get(port)

  if (!instance) {
    return { success: false, error: 'Server not running' }
  }

  return new Promise((resolve) => {
    instance.server.close(() => {
      serverInstances.delete(port)
      resolve({ success: true })
    })
  })
})

ipcMain.handle('ports:list', async () => {
  const ports: Array<{ port: number; process: string; pid?: number; type: 'app' | 'system' }> = []

  // Add ports from our server instances
  for (const [port, instance] of serverInstances.entries()) {
    ports.push({
      port,
      process: 'VS Code Clone Server',
      type: 'app',
    })
  }

  // Get system-wide active ports using netstat on Windows
  try {
    const { exec } = await import('node:child_process')
    const { promisify } = await import('node:util')
    const execAsync = promisify(exec)

    const { stdout } = await execAsync('netstat -ano | findstr LISTENING')
    const lines = stdout.split('\n').filter((line: string) => line.trim())

    for (const line of lines) {
      const parts = line.trim().split(/\s+/)
      if (parts.length >= 5) {
        const localAddress = parts[1]
        const pid = parts[4]

        // Extract port from address (format: 0.0.0.0:PORT or [::]:PORT)
        const portMatch = localAddress.match(/:(\d+)$/)
        if (portMatch) {
          const port = parseInt(portMatch[1], 10)
          const pidNum = parseInt(pid, 10)

          // Skip if we already have this port from our server instances
          if (!ports.some((p) => p.port === port)) {
            // Try to get process name
            let processName = 'Unknown'
            try {
              const { stdout: taskListOutput } = await execAsync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`)
              const taskListParts = taskListOutput.trim().split(',')
              if (taskListParts.length > 0) {
                processName = taskListParts[0].replace(/"/g, '').trim()
              }
            } catch {
              processName = `PID ${pid}`
            }

            ports.push({
              port,
              process: processName,
              pid: pidNum,
              type: 'system',
            })
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to get system ports:', err)
  }

  // Sort by port number
  ports.sort((a, b) => a.port - b.port)

  return { success: true, ports }
})

ipcMain.handle('file:save', async (_event, options: { filePath: string; content: string }) => {
  try {
    const dir = path.dirname(options.filePath)
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }
    await writeFile(options.filePath, options.content, 'utf8')
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
})

  ipcMain.handle('news:fetch', async () => {
    try {
      const response = await fetch('https://api.npoint.io/3828ca8953dc2c36571a')
      if (!response.ok) {
        const text = await response.text()
        return { success: false, error: `Failed to fetch news (${response.status})`, content: text }
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        return { success: false, error: `Invalid response type from news API. Expected JSON but received ${contentType || 'unknown'}`, content: text }
      }

      const data = await response.json()
      return { success: true, data }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      if (errorMessage.includes('Unexpected token')) {
        return { success: false, error: 'News API returned invalid data (HTML instead of JSON). The endpoint may be down or misconfigured.' }
      }
      return { success: false, error: errorMessage }
    }
  })

  ipcMain.handle('api-keys:get', () => {
    return {
      success: true,
      keys: {
        gemini: process.env.GEMINI_API_KEY || '',
        chatgpt: process.env.OPENAI_API_KEY || '',
        claude: process.env.ANTHROPIC_API_KEY || '',
        mistral: process.env.MISTRAL_API_KEY || '',
      },
    }
  })

  ipcMain.handle('ai:chat', async (_event, payload: AIChatPayload) => {
    try {
      const response = await requestAIResponse(payload)
      return { success: true, response }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.on('ai:chat:stream', async (event, payload: AIChatPayload) => {
    try {
      const response = await requestAIResponse(payload, event)
      event.sender.send('ai:chat:complete', { success: true, response })
    } catch (err) {
      event.sender.send('ai:chat:complete', { success: false, error: err instanceof Error ? err.message : String(err) })
    }
  })
}

function createWindow() {
  win = createBrowserWindow({
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    minWidth: 980,
    minHeight: 640,
    height: 740,
    width: 1220,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isHttpsUrl(url)) {
      openWebsiteWindow(url)
      return { action: 'deny' }
    }

    return { action: 'allow' }
  })

  win.webContents.on('will-navigate', (event, url) => {
    if (!isHttpsUrl(url)) {
      return
    }

    event.preventDefault()
    openWebsiteWindow(url)
  })

  win.webContents.on('before-input-event', (event, input) => {
    const isDevtoolsShortcut = input.type === 'keyDown'
      && input.shift
      && input.key.toLowerCase() === 'i'
      && (input.control || input.meta)

    if (isDevtoolsShortcut) {
      event.preventDefault()
      win?.webContents.toggleDevTools()
    }

    // Rickroll easter egg: track Control key presses after right-click
    if (input.type === 'keyDown' && rightClickPressed && input.key.toLowerCase() === 'control') {
      ctrlPressCount++

      if (ctrlPressTimeout) {
        clearTimeout(ctrlPressTimeout)
      }

      ctrlPressTimeout = setTimeout(() => {
        rightClickPressed = false
        ctrlPressCount = 0
      }, 2000)

      if (ctrlPressCount >= 2) {
        openRickrollWindow()
        rightClickPressed = false
        ctrlPressCount = 0
        if (ctrlPressTimeout) {
          clearTimeout(ctrlPressTimeout)
          ctrlPressTimeout = null
        }
      }
    }
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  win.on('closed', () => {
    if (win && !win.isDestroyed()) {
      disposeTerminalSession(win)
      destroyBrowserView(win)
    }
    win = null
  })
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

let libreTranslateProcess: ChildProcessWithoutNullStreams | null = null

function startLibreTranslate() {
  try {
    console.log('Starting LibreTranslate server...')
    libreTranslateProcess = spawn('python', ['-m', 'libretranslate.main', '--host', '127.0.0.1', '--port', '5000'])

    libreTranslateProcess.stdout.on('data', (data) => {
      console.log(`LibreTranslate: ${data}`)
    })

    libreTranslateProcess.stderr.on('data', (data) => {
      console.error(`LibreTranslate error: ${data}`)
    })

    libreTranslateProcess.on('close', (code) => {
      console.log(`LibreTranslate process exited with code ${code}`)
      libreTranslateProcess = null
    })
  } catch (err) {
    console.error('Failed to start LibreTranslate:', err)
  }
}

app.whenReady().then(() => {
  if (isWindowsBelow20H2()) {
    void dialog.showMessageBox({
      type: 'warning',
      title: 'Windows version warning',
      message: 'Windows 10 version 20H2 or newer is recommended.',
      detail: `Detected ${os.release()}. The app will still run, but compatibility issues may occur.`,
    })
  }

  // Start LibreTranslate server
  startLibreTranslate()

  registerIpc()
  createWindow()
})

app.on('before-quit', () => {
  if (libreTranslateProcess) {
    console.log('Stopping LibreTranslate server...')
    libreTranslateProcess.kill()
  }
})

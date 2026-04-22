export type ExplorerItem = {
  name: string
  path: string
  kind: 'file' | 'directory'
  depth: number
  active?: boolean
}

export type FileTab = {
  id: string
  kind: 'file'
  name: string
  path: string
  active?: boolean
}

export type BrowserTab = {
  id: string
  kind: 'browser'
  name: string
  url: string
  active?: boolean
}

export type NewsTab = {
  id: string
  kind: 'news'
  name: string
  active?: boolean
}

export type WorkbenchTab = FileTab | BrowserTab | NewsTab

export type BrowserState = {
  url: string
  title: string
  canGoBack: boolean
  canGoForward: boolean
  loading: boolean
}

export type CodeProblem = {
  message: string
  severity: 'error' | 'warning' | 'info' | 'hint'
  line: number
  column: number
  source?: string
}

export type RevealTarget = {
  line: number
  column: number
  nonce: number
}

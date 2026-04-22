import {
  Blocks,
  Bug,
  Files,
  GitBranch,
  Play,
  Search,
  Server,
  Settings,
} from 'lucide-vue-next'

export const activityItems = [
  { id: 'explorer', label: 'Explorer', icon: Files, active: true },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'source-control', label: 'Source Control', icon: GitBranch },
  { id: 'run', label: 'Run and Debug', icon: Play },
  { id: 'extensions', label: 'Extensions', icon: Blocks },
  { id: 'debug', label: 'Debug', icon: Bug },
  { id: 'server', label: 'Web Server', icon: Server },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export const bottomItems = ['PROBLEMS', 'OUTPUT', 'DEBUG CONSOLE', 'TERMINAL', 'PORTS']

export const defaultEditorContent = `// Open a folder or a file to start browsing your workspace.
// The explorer now reads from the real filesystem through Electron preload IPC.

export function bootWorkbench() {
  console.log('VS Code clone ready')
}
`

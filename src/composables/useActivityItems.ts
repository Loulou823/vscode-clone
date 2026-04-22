import { computed } from 'vue'
import { useI18n } from '../i18n'
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

export function useActivityItems() {
  const { t } = useI18n()

  return computed(() => [
    { id: 'explorer', label: t('activityBar.explorer'), icon: Files, active: true },
    { id: 'search', label: t('activityBar.search'), icon: Search },
    { id: 'source-control', label: t('activityBar.git'), icon: GitBranch },
    { id: 'run', label: t('activityBar.debug'), icon: Play },
    { id: 'extensions', label: t('activityBar.extensions'), icon: Blocks },
    { id: 'debug', label: 'Debug', icon: Bug },
    { id: 'server', label: 'Web Server', icon: Server },
    { id: 'settings', label: t('settings.title'), icon: Settings },
  ])
}

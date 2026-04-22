<script setup lang="ts">
import { FileCode2, FolderOpen, Newspaper } from 'lucide-vue-next'
import { useI18n } from '../i18n'

const { t } = useI18n()

const emit = defineEmits<{
  openFolder: []
  openFile: []
  openNews: []
}>()
</script>

<template>
  <div class="home-screen">
    <div class="home-content">
      <h1 class="home-title">{{ t('home.title') }}</h1>
      <p class="home-subtitle">{{ t('home.subtitle') }}</p>
      
      <div class="home-actions">
        <button class="home-action" type="button" @click="emit('openFolder')">
          <FolderOpen :size="24" />
          <div class="home-action-text">
            <span class="home-action-title">{{ t('home.openFolder') }}</span>
            <span class="home-action-desc">{{ t('home.openFolderDesc') }}</span>
          </div>
        </button>
        
        <button class="home-action" type="button" @click="emit('openFile')">
          <FileCode2 :size="24" />
          <div class="home-action-text">
            <span class="home-action-title">{{ t('home.openFile') }}</span>
            <span class="home-action-desc">{{ t('home.openFileDesc') }}</span>
          </div>
        </button>
        
        <button class="home-action" type="button" @click="emit('openNews')">
          <Newspaper :size="24" />
          <div class="home-action-text">
            <span class="home-action-title">{{ t('home.news') }}</span>
            <span class="home-action-desc">{{ t('home.newsDesc') }}</span>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: var(--bg-primary);
}

.home-content {
  text-align: center;
  max-width: 500px;
  padding: 2rem;
}

.home-title {
  font-size: 2.5rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: var(--fg-primary);
}

.home-subtitle {
  font-size: 1rem;
  color: var(--fg-secondary);
  margin: 0 0 2rem 0;
}

.home-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: stretch;
}

.home-action {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--fg-primary);
  text-align: left;
}

.home-action:hover {
  background: var(--bg-tertiary);
  border-color: var(--accent-color);
}

.home-action-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.home-action-title {
  font-weight: 600;
  font-size: 0.95rem;
}

.home-action-desc {
  font-size: 0.85rem;
  color: var(--fg-secondary);
}
</style>

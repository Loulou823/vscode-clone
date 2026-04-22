<script setup lang="ts">
import type { LucideIcon } from 'lucide-vue-next'

const props = defineProps<{
  items: Array<{
    id: string
    label: string
    icon: LucideIcon
    active?: boolean
  }>
  activeItem?: string
}>()

const emit = defineEmits(['item-click'])

function handleItemClick(item: any) {
  emit('item-click', item.id)
}
</script>

<template>
  <aside class="activitybar">
    <button
      v-for="item in items"
      :key="item.id"
      class="activity-button"
      :class="{ active: activeItem === item.id }"
      type="button"
      :aria-label="item.label"
      :title="item.label"
      @click="handleItemClick(item)"
    >
      <component :is="item.icon" :size="20" />
    </button>
  </aside>
</template>

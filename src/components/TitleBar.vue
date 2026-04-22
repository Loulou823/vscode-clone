<script setup lang="ts">
import { Bell, LayoutGrid, Menu, Minus, Search, SplitSquareVertical, Square, X } from 'lucide-vue-next'

function openAppMenu(event: MouseEvent) {
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()

  window.appWindow.openAppMenu({
    x: bounds.left,
    y: bounds.bottom,
  })
}

function minimizeWindow() {
  window.appWindow.minimize()
}

function toggleMaximizeWindow() {
  window.appWindow.toggleMaximize()
}

function closeWindow() {
  window.appWindow.close()
}
</script>

<template>
  <header class="titlebar">
    <div class="titlebar-leading no-drag">
      <button class="icon-button titlebar-button" type="button" aria-label="Open application menu" @click="openAppMenu">
        <Menu :size="16" />
      </button>
    </div>
    <div class="titlebar-center">
      <div class="command-center no-drag">
        <Search :size="14" />
        <span>vscode-clone</span>
      </div>
    </div>
    <div class="titlebar-actions no-drag">
      <button class="icon-button" type="button" aria-label="Layout options">
        <SplitSquareVertical :size="16" />
      </button>
      <button class="icon-button" type="button" aria-label="Extensions view">
        <LayoutGrid :size="16" />
      </button>
      <button class="icon-button" type="button" aria-label="Notifications">
        <Bell :size="16" />
      </button>
      <div class="window-controls">
        <button class="window-control" type="button" aria-label="Minimize window" @click="minimizeWindow">
          <Minus :size="16" />
        </button>
        <button class="window-control" type="button" aria-label="Maximize window" @click="toggleMaximizeWindow">
          <Square :size="14" />
        </button>
        <button class="window-control close" type="button" aria-label="Close window" @click="closeWindow">
          <X :size="16" />
        </button>
      </div>
    </div>
  </header>
</template>

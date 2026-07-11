<template>
  <header
    class="titlebar"
    data-tauri-drag-region
  >
    <span
      class="app-name"
      data-tauri-drag-region
    >Pomodoro</span>
    <div class="actions">
      <button
        type="button"
        class="titlebar-btn"
        aria-label="最小化"
        @click="minimize"
      >
        &#x2212;
      </button>
      <button
        type="button"
        class="titlebar-btn close"
        aria-label="關閉"
        @click="closeApp"
      >
        &#x2715;
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useWindowControls } from '@/composables/useWindowControls'

const { minimize, closeApp } = useWindowControls()
</script>

<style scoped>
.titlebar {
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 0 8px;
  background: rgba(0, 0, 0, 0.25);
  color: #fff;
  flex: none;
}

.app-name {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.actions {
  display: flex;
  gap: 2px;
}

/* 可互動元件為不可拖曳區（未加 data-tauri-drag-region 即不可拖曳） */
.titlebar-btn {
  width: 26px;
  height: 22px;
  border: none;
  border-radius: 3px;
  background: transparent;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  line-height: 1;
}

.titlebar-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.titlebar-btn.close:hover {
  background: #d13438;
}
</style>

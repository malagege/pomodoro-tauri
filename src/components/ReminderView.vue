<template>
  <div
    class="reminder"
    :style="{ backgroundColor: payload.background, color: payload.textColor }"
    role="alertdialog"
    aria-label="番茄鐘提醒"
    @click="close"
    @contextmenu.prevent
  >
    <p class="message">{{ payload.message }}</p>
    <p class="hint">點擊任意位置關閉</p>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive } from 'vue'
import { isTauri } from '@/adapters/env'
import type { ReminderPayload } from '@/composables/useNotifications'

const payload = reactive<ReminderPayload>({
  message: '',
  background: '#FFF8E1',
  textColor: '#212121',
})

let unlisten: (() => void) | null = null

function blockKeyboardShortcuts(event: KeyboardEvent): void {
  event.preventDefault()
  event.stopPropagation()
}

onMounted(async () => {
  window.addEventListener('keydown', blockKeyboardShortcuts, true)
  if (!isTauri()) return
  const { listen, emit } = await import('@tauri-apps/api/event')
  unlisten = await listen<ReminderPayload>('reminder-update', (event) => {
    payload.message = event.payload.message
    payload.background = event.payload.background
    payload.textColor = event.payload.textColor
  })
  // 通知主視窗補送最新提醒內容，避免建窗與事件的競態
  await emit('reminder-ready')
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', blockKeyboardShortcuts, true)
  unlisten?.()
})

async function close(): Promise<void> {
  if (!isTauri()) return
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  // 只關閉提醒窗；不影響主程式與 timer（spec 8.2）
  await getCurrentWindow().close()
}
</script>

<style scoped>
.reminder {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  cursor: pointer;
  text-align: center;
  padding: 24px;
}

.message {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.4;
}

.hint {
  font-size: 13px;
  opacity: 0.65;
}
</style>

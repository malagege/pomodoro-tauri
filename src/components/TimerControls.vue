<template>
  <div class="controls">
    <button
      type="button"
      class="ctrl-btn"
      :aria-label="actionLabel"
      :title="actionLabel"
      @click="timer.toggle()"
    >
      <span aria-hidden="true">{{ actionIcon }}</span>
    </button>

    <div class="time-block">
      <span
        class="time"
        role="timer"
        :aria-label="`${timer.phaseLabel}剩餘時間 ${timer.timeText}`"
      >{{ timer.timeText }}</span>
      <span class="phase">{{ timer.phaseLabel }}・{{ timer.statusLabel }}</span>
    </div>

    <button
      type="button"
      class="ctrl-btn"
      aria-label="設定"
      title="設定"
      @click="emit('toggle-settings')"
    >
      <span aria-hidden="true">⚙</span>
    </button>
  </div>

  <p
    v-if="timer.idleGateError"
    class="idle-error"
    role="alert"
  >
    {{ timer.idleGateError }}
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTimerStore } from '@/stores/timer'

const emit = defineEmits<{ (e: 'toggle-settings'): void }>()

const timer = useTimerStore()

// icon 與 aria-label 代表點擊後的動作（spec 4.2）
const actionLabel = computed(() => {
  if (timer.nextAction === 'pause') return '暫停'
  return timer.status === 'paused' || timer.status === 'paused_grace' ? '繼續' : '開始'
})
const actionIcon = computed(() => (timer.nextAction === 'pause' ? '⏸' : '▶'))
</script>

<style scoped>
.controls {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  flex: none;
}

.ctrl-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  flex: none;
}

.ctrl-btn:hover {
  background: rgba(0, 0, 0, 0.55);
}

/* 深色底墊在時間文字後面，波浪升到頂或桌面很亮時都保持可讀 */
.time-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 6px;
  padding: 2px 6px;
}

.time {
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #f2ffe0;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
}

.phase {
  font-size: 10px;
  color: rgba(242, 255, 224, 0.85);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.idle-error {
  margin: 0 6px 4px;
  padding: 4px 6px;
  font-size: 11px;
  color: #7a1f1f;
  background: rgba(255, 235, 235, 0.9);
  border-radius: 4px;
}
</style>

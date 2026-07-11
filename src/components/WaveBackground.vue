<template>
  <div
    class="wave-wrapper"
    aria-hidden="true"
  >
    <div
      class="balls"
      :style="{ top: `${topPercent}%`, '--wave-color': color }"
    >
      <div class="ball ball1" />
      <div class="ball ball2" />
      <div class="ball ball3" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { legacyTopPercent } from '@/domain/wave'

const props = defineProps<{
  /** 0–100 的填充百分比 */
  fill: number
  color: string
}>()

// 舊版垂直校正公式（spec 7.4），封裝為純函式
const topPercent = computed(() => legacyTopPercent(props.fill))
</script>

<style scoped>
/* 相容舊版 TheBackground.vue（spec 7.3）：
   三個 1500vw × 1500vh 巨型圓，僅露出邊緣形成波峰，
   波浪感來自 0/2/4 秒錯開的水平動畫。 */
.wave-wrapper {
  position: fixed;
  z-index: -1;
  top: 0;
  left: 0;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  pointer-events: none;
}

.balls {
  position: relative;
  height: 100%;
  width: 100%;
  transition: top 1s;
}

.ball {
  position: absolute;
  right: 0;
  margin-left: -750%;
  height: 1500vh;
  width: 1500vw;
  border-radius: 50%;
  left: 50%;
  background-color: var(--wave-color, greenyellow);
}

.ball1 {
  animation: move 5s 0s infinite ease-in-out;
}

.ball2 {
  animation: move 5s 2s infinite ease-in-out;
}

.ball3 {
  animation: move 5s 4s infinite ease-in-out;
}

/* 與舊版相同：每輪由 -10% 移到 10%，不使用 alternate（spec 7.2） */
@keyframes move {
  from {
    transform: translateX(-10%);
  }

  to {
    transform: translateX(10%);
  }
}

/* 降低動態效果偏好：保留高度進度、停止水平波動（spec 7.5） */
@media (prefers-reduced-motion: reduce) {
  .ball1,
  .ball2,
  .ball3 {
    animation: none;
  }
}
</style>

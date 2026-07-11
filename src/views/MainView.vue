<template>
  <div class="main-view">
    <AppTitleBar />
    <TimerControls @toggle-settings="showSettings = !showSettings" />
    <SettingsPanel
      v-if="showSettings"
      @close="showSettings = false"
    />
    <WaveBackground
      :fill="timer.fill"
      :color="timer.waveColor"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import AppTitleBar from '@/components/AppTitleBar.vue'
import TimerControls from '@/components/TimerControls.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'
import WaveBackground from '@/components/WaveBackground.vue'
import { useSettingsStore } from '@/stores/settings'
import { useTimerStore } from '@/stores/timer'
import { useWindowControls } from '@/composables/useWindowControls'
import { useUpdater } from '@/composables/useUpdater'

const settingsStore = useSettingsStore()
const timer = useTimerStore()
const { setAlwaysOnTop } = useWindowControls()
const updater = useUpdater()

const showSettings = ref(false)

onMounted(async () => {
  await settingsStore.load()
  void setAlwaysOnTop(settingsStore.settings.alwaysOnTop)
  // 第一次啟動直接進入 work/running（spec 5.3）
  timer.start()
  if (settingsStore.settings.autoCheckUpdates) {
    void updater.checkOnStartup()
  }
})

onUnmounted(() => {
  timer.stop()
})
</script>

<style scoped>
.main-view {
  position: relative;
  height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>

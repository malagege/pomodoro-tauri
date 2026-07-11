<template>
  <section
    class="settings-panel"
    aria-label="設定"
  >
    <div class="panel-head">
      <h2>設定</h2>
      <span
        v-if="dirty"
        class="dirty-badge"
      >尚未套用</span>
      <button
        type="button"
        class="close-btn"
        aria-label="關閉設定"
        @click="requestClose"
      >
        ✕
      </button>
    </div>

    <form
      class="fields"
      @submit.prevent="onApply"
    >
      <label>
        工作時間（秒）
        <input
          v-model.number="draft.workDurationSec"
          type="number"
          min="1"
          max="86400"
        >
        <span
          v-if="errors.workDurationSec"
          class="error"
        >{{ errors.workDurationSec }}</span>
      </label>

      <label>
        休息時間（秒）
        <input
          v-model.number="draft.breakDurationSec"
          type="number"
          min="1"
          max="86400"
        >
        <span
          v-if="errors.breakDurationSec"
          class="error"
        >{{ errors.breakDurationSec }}</span>
      </label>

      <label>
        閒置門檻（秒）
        <input
          v-model.number="draft.idleThresholdSec"
          type="number"
          min="1"
          max="3600"
        >
        <span
          v-if="errors.idleThresholdSec"
          class="error"
        >{{ errors.idleThresholdSec }}</span>
      </label>

      <label>
        提醒重複間隔（秒）
        <input
          v-model.number="draft.reminderRepeatSec"
          type="number"
          min="5"
          max="3600"
        >
        <span
          v-if="errors.reminderRepeatSec"
          class="error"
        >{{ errors.reminderRepeatSec }}</span>
      </label>

      <label>
        手動暫停寬限（秒）
        <input
          v-model.number="draft.manualPauseGraceSec"
          type="number"
          min="5"
          max="3600"
        >
        <span
          v-if="errors.manualPauseGraceSec"
          class="error"
        >{{ errors.manualPauseGraceSec }}</span>
      </label>

      <label class="row">
        <input
          v-model="draft.autoStart"
          type="checkbox"
        >
        自動開始
      </label>

      <label class="row">
        <input
          v-model="draft.alwaysOnTop"
          type="checkbox"
        >
        視窗置頂
      </label>

      <label>
        工作波浪顏色
        <input
          v-model="draft.workWaveColor"
          type="color"
        >
        <span
          v-if="errors.workWaveColor"
          class="error"
        >{{ errors.workWaveColor }}</span>
      </label>

      <label>
        休息波浪顏色
        <input
          v-model="draft.breakWaveColor"
          type="color"
        >
        <span
          v-if="errors.breakWaveColor"
          class="error"
        >{{ errors.breakWaveColor }}</span>
      </label>

      <label>
        工作提醒文字
        <input
          v-model="draft.workMessage"
          type="text"
          maxlength="200"
        >
        <span
          v-if="errors.workMessage"
          class="error"
        >{{ errors.workMessage }}</span>
      </label>

      <label>
        休息提醒文字
        <input
          v-model="draft.breakMessage"
          type="text"
          maxlength="200"
        >
        <span
          v-if="errors.breakMessage"
          class="error"
        >{{ errors.breakMessage }}</span>
      </label>

      <label class="row">
        <input
          v-model="draft.autoCheckUpdates"
          type="checkbox"
        >
        啟動時自動檢查更新
      </label>

      <div class="actions">
        <button
          type="submit"
          :disabled="!canApply"
        >
          套用設定
        </button>
        <button
          type="button"
          :disabled="!dirty"
          @click="cancelChanges"
        >
          取消變更
        </button>
        <button
          type="button"
          @click="dialog = 'resetConfirm'"
        >
          恢復預設設定
        </button>
      </div>
    </form>

    <div class="updater">
      <button
        type="button"
        :disabled="updater.checking.value"
        @click="updater.checkManually"
      >
        檢查更新
      </button>
      <p
        v-if="updater.statusText.value"
        class="update-status"
      >
        {{ updater.statusText.value }}
      </p>
      <div v-if="updater.available.value">
        <p class="update-notes">{{ updater.available.value.notes }}</p>
        <button
          type="button"
          @click="updater.downloadAndInstall"
        >
          下載並安裝
        </button>
        <button
          type="button"
          @click="updater.deferUpdate"
        >
          稍後再說
        </button>
      </div>
    </div>

    <!-- 對話框 -->
    <div
      v-if="dialog !== 'none'"
      class="dialog-backdrop"
    >
      <div
        class="dialog"
        role="dialog"
        aria-modal="true"
      >
        <template v-if="dialog === 'durationChoice'">
          <p>你修改了目前「{{ timer.phaseLabel }}」階段的時長，要如何套用？</p>
          <div class="dialog-actions">
            <button
              type="button"
              @click="chooseNextRound"
            >
              從下輪生效
            </button>
            <button
              type="button"
              @click="chooseApplyNow"
            >
              立即套用本輪
            </button>
            <button
              type="button"
              @click="dialog = 'none'"
            >
              取消
            </button>
          </div>
        </template>

        <template v-else-if="dialog === 'completeWarning'">
          <p>新時長小於等於本階段已經過的時間，套用後本階段會<strong>立即完成</strong>。確定要繼續嗎？</p>
          <div class="dialog-actions">
            <button
              type="button"
              @click="confirmImmediateComplete"
            >
              確定套用
            </button>
            <button
              type="button"
              @click="dialog = 'none'"
            >
              取消
            </button>
          </div>
        </template>

        <template v-else-if="dialog === 'resetConfirm'">
          <p>確定要把所有設定恢復成預設值嗎？此動作會立即寫入設定檔。</p>
          <div class="dialog-actions">
            <button
              type="button"
              @click="confirmReset"
            >
              確定恢復
            </button>
            <button
              type="button"
              @click="dialog = 'none'"
            >
              取消
            </button>
          </div>
        </template>

        <template v-else-if="dialog === 'closeConfirm'">
          <p>設定尚未套用，關閉面板將捨棄未套用的變更。</p>
          <div class="dialog-actions">
            <button
              type="button"
              @click="dialog = 'none'"
            >
              繼續編輯
            </button>
            <button
              type="button"
              @click="discardAndClose"
            >
              捨棄變更
            </button>
          </div>
        </template>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { AppSettings } from '@/types/settings'
import { validateSettings } from '@/domain/validation'
import { useSettingsStore } from '@/stores/settings'
import { useTimerStore } from '@/stores/timer'
import { useWindowControls } from '@/composables/useWindowControls'
import { useUpdater } from '@/composables/useUpdater'

const emit = defineEmits<{ (e: 'close'): void }>()

const settingsStore = useSettingsStore()
const timer = useTimerStore()
const { setAlwaysOnTop } = useWindowControls()
const updater = useUpdater()

type DialogKind = 'none' | 'durationChoice' | 'completeWarning' | 'resetConfirm' | 'closeConfirm'
const dialog = ref<DialogKind>('none')

// 草稿：輸入不直接改動已保存設定或 timer（spec 4.4）
const draft = reactive<AppSettings>({ ...settingsStore.settings })

const errors = computed(() => validateSettings(draft))
const dirty = computed(
  () => JSON.stringify(draft) !== JSON.stringify(settingsStore.settings),
)
const canApply = computed(() => dirty.value && Object.keys(errors.value).length === 0)

const currentPhaseKey = computed<'workDurationSec' | 'breakDurationSec'>(() =>
  timer.phase === 'work' ? 'workDurationSec' : 'breakDurationSec',
)

function onApply(): void {
  if (!canApply.value) return
  // 只對目前 phase 的時長變更詢問；另一個 phase 一律下輪生效（spec 4.4）
  const changedCurrentPhase =
    draft[currentPhaseKey.value] !== settingsStore.settings[currentPhaseKey.value]
  if (changedCurrentPhase) {
    dialog.value = 'durationChoice'
  } else {
    commitSettings()
  }
}

/** 從下輪生效：不修改目前 TimerState snapshot */
function chooseNextRound(): void {
  dialog.value = 'none'
  commitSettings()
}

/** 立即套用本輪：保留已經過時間（spec 5.4） */
function chooseApplyNow(): void {
  const result = timer.applyCurrentPhaseDuration(draft[currentPhaseKey.value], false)
  if (result.completesImmediately) {
    dialog.value = 'completeWarning'
    return
  }
  dialog.value = 'none'
  commitSettings()
}

function confirmImmediateComplete(): void {
  timer.applyCurrentPhaseDuration(draft[currentPhaseKey.value], true)
  dialog.value = 'none'
  commitSettings()
}

function commitSettings(): void {
  try {
    settingsStore.apply({ ...draft })
    void setAlwaysOnTop(draft.alwaysOnTop)
  } catch (err) {
    console.error('[settings] 套用失敗:', err)
  }
}

function cancelChanges(): void {
  Object.assign(draft, settingsStore.settings)
}

async function confirmReset(): Promise<void> {
  dialog.value = 'none'
  await settingsStore.resetToDefaults()
  Object.assign(draft, settingsStore.settings)
  // 立即套用安全的即時設定；時長依 5.4 於下輪生效
  void setAlwaysOnTop(settingsStore.settings.alwaysOnTop)
}

function requestClose(): void {
  if (dirty.value) {
    dialog.value = 'closeConfirm'
    return
  }
  void settingsStore.flush()
  emit('close')
}

function discardAndClose(): void {
  cancelChanges()
  dialog.value = 'none'
  void settingsStore.flush()
  emit('close')
}
</script>

<style scoped>
.settings-panel {
  position: absolute;
  top: 30px;
  left: 0;
  right: 0;
  bottom: 0;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.92);
  padding: 8px;
  z-index: 10;
  font-size: 12px;
}

.panel-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.panel-head h2 {
  font-size: 14px;
  flex: 1;
}

.dirty-badge {
  background: #fff3cd;
  color: #7a5b00;
  border-radius: 3px;
  padding: 1px 5px;
  font-size: 10px;
  flex: none;
}

.close-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
}

.fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

label.row {
  flex-direction: row;
  align-items: center;
  gap: 6px;
}

input[type='number'],
input[type='text'] {
  width: 100%;
  padding: 3px 5px;
  border: 1px solid #bbb;
  border-radius: 4px;
  font-size: 12px;
}

.error {
  color: #b3261e;
  font-size: 11px;
}

.actions,
.dialog-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

button {
  padding: 4px 8px;
  border: 1px solid #999;
  border-radius: 4px;
  background: #f5f5f5;
  cursor: pointer;
  font-size: 12px;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button[type='submit'] {
  background: #2e7d32;
  border-color: #2e7d32;
  color: #fff;
}

.updater {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.update-status {
  font-size: 11px;
  color: #444;
}

.update-notes {
  font-size: 11px;
  white-space: pre-wrap;
}

.dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}

.dialog {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  margin: 8px;
  max-width: 90%;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.dialog p {
  margin-bottom: 8px;
  line-height: 1.5;
}
</style>

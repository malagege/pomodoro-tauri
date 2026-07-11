import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { TimerEvent, TimerState, TransitionResult } from '@/types/timer'
import {
  applyDurationToCurrentPhase,
  idleSample,
  initialState,
  pause,
  resume,
  tick,
  type TimerSettingsSnapshot,
} from '@/domain/timerStateMachine'
import { fillPercent, legacyTopPercent } from '@/domain/wave'
import { formatMMSS } from '@/domain/format'
import { idleProvider } from '@/adapters/idle'
import { sendPhaseReminder, startReminderReadyListener } from '@/composables/useNotifications'
import { useSettingsStore } from './settings'

const TICK_INTERVAL_MS = 250
const IDLE_POLL_INTERVAL_MS = 1000
const IDLE_FAILURE_LIMIT = 3
const IDLE_ERROR_LOG_THROTTLE_MS = 30_000

export const useTimerStore = defineStore('timer', () => {
  const settingsStore = useSettingsStore()

  const state = ref<TimerState | null>(null)
  const reminderCount = ref(0)
  const idleGateError = ref<string | null>(null)

  let tickHandle: ReturnType<typeof setInterval> | null = null
  let idleHandle: ReturnType<typeof setInterval> | null = null
  let lastReminderAtMs = 0
  let idleFailures = 0
  let lastIdleErrorLogMs = 0
  let idlePollInFlight = false

  const snapshot = computed<TimerSettingsSnapshot>(() => ({
    workDurationSec: settingsStore.settings.workDurationSec,
    breakDurationSec: settingsStore.settings.breakDurationSec,
    autoStart: settingsStore.settings.autoStart,
    manualPauseGraceSec: settingsStore.settings.manualPauseGraceSec,
  }))

  const fill = computed(() =>
    state.value ? fillPercent(state.value.phase, state.value.durationSec, state.value.remainingSec) : 0,
  )
  const waveTopPercent = computed(() => legacyTopPercent(fill.value))
  const timeText = computed(() => formatMMSS(state.value?.remainingSec ?? 0))
  const phase = computed(() => state.value?.phase ?? 'work')
  const phaseLabel = computed(() => (phase.value === 'work' ? '工作' : '休息'))
  const status = computed(() => state.value?.status ?? 'paused')
  const waveColor = computed(() =>
    phase.value === 'work' ? settingsStore.settings.workWaveColor : settingsStore.settings.breakWaveColor,
  )
  /** 按鈕代表點擊後的動作（spec 4.2） */
  const nextAction = computed<'pause' | 'resume'>(() => (status.value === 'running' ? 'pause' : 'resume'))
  const statusLabel = computed(() => {
    switch (status.value) {
      case 'running':
        return phase.value === 'work' ? '工作倒數中' : '休息倒數中'
      case 'paused':
        return '已暫停'
      case 'paused_grace':
        return '已暫停（寬限中）'
      case 'awaiting_break_idle':
        return '等待離開電腦開始休息'
      case 'awaiting_work_activity':
        return '等待回到電腦開始工作'
    }
  })

  function handleEvent(event: TimerEvent): void {
    const s = settingsStore.settings
    switch (event) {
      case 'workCompleted':
        // 工作完成：立即發送第一次休息提醒（spec 6.1）
        reminderCount.value = 1
        lastReminderAtMs = Date.now()
        void sendPhaseReminder('break', s.breakMessage, 1)
        break
      case 'breakCompleted':
        // 休息完成：發送一次工作提醒，不重複、不放大（spec 6.2 / 8.3）
        void sendPhaseReminder('work', s.workMessage, 1)
        break
      case 'breakStarted':
        // 正式開始休息倒數：提醒計數歸零（spec 8.3）
        reminderCount.value = 0
        break
      case 'workStarted':
        break
    }
  }

  function applyResult(result: TransitionResult): void {
    state.value = result.state
    for (const event of result.events) handleEvent(event)
  }

  function doTick(): void {
    if (!state.value) return
    applyResult(tick(state.value, Date.now(), snapshot.value))
  }

  async function pollIdle(): Promise<void> {
    const st = state.value
    if (!st || (st.status !== 'awaiting_break_idle' && st.status !== 'awaiting_work_activity')) return
    if (idlePollInFlight) return
    idlePollInFlight = true
    try {
      const idleSec = await idleProvider.getIdleSeconds()
      idleFailures = 0
      idleGateError.value = null
      const now = Date.now()
      applyResult(idleSample(st, idleSec, settingsStore.settings.idleThresholdSec, now))

      // 等待休息期間使用者仍活躍：依設定間隔重複提醒並逐次加強（spec 6.1 / 8.3）
      if (
        state.value?.status === 'awaiting_break_idle' &&
        idleSec < settingsStore.settings.idleThresholdSec &&
        now - lastReminderAtMs >= settingsStore.settings.reminderRepeatSec * 1000
      ) {
        reminderCount.value += 1
        lastReminderAtMs = now
        void sendPhaseReminder('break', settingsStore.settings.breakMessage, reminderCount.value)
      }
    } catch (err) {
      idleFailures += 1
      const now = Date.now()
      if (now - lastIdleErrorLogMs >= IDLE_ERROR_LOG_THROTTLE_MS) {
        lastIdleErrorLogMs = now
        console.warn('[idle] 閒置偵測失敗:', err)
      }
      // 連續失敗：不得卡死在等待狀態，退回手動開始（spec 6.3）
      if (idleFailures >= IDLE_FAILURE_LIMIT && state.value) {
        idleGateError.value = '無法偵測系統閒置時間，已改為手動開始。'
        state.value = { ...state.value, status: 'paused', resumeEligibleAtMs: null }
      }
    } finally {
      idlePollInFlight = false
    }
  }

  /** 啟動唯一的 scheduler（僅主視窗呼叫一次）。 */
  function start(): void {
    if (state.value) return
    state.value = initialState(settingsStore.settings.workDurationSec, Date.now())
    tickHandle = setInterval(doTick, TICK_INTERVAL_MS)
    idleHandle = setInterval(() => void pollIdle(), IDLE_POLL_INTERVAL_MS)
    void startReminderReadyListener()
  }

  function stop(): void {
    if (tickHandle !== null) clearInterval(tickHandle)
    if (idleHandle !== null) clearInterval(idleHandle)
    tickHandle = null
    idleHandle = null
  }

  /** 開始／暫停／繼續按鈕。 */
  function toggle(): void {
    if (!state.value) return
    const now = Date.now()
    if (state.value.status === 'running') {
      state.value = pause(state.value, now, snapshot.value)
    } else {
      idleGateError.value = null
      applyResult(resume(state.value, now))
    }
  }

  /**
   * 立即套用新時長到目前階段（spec 5.4）。
   * 回傳 completesImmediately=true 且未 confirm 時，呼叫端需先警告使用者。
   */
  function applyCurrentPhaseDuration(
    newDurationSec: number,
    confirmComplete = false,
  ): { applied: boolean; completesImmediately: boolean } {
    if (!state.value) return { applied: false, completesImmediately: false }
    const result = applyDurationToCurrentPhase(
      state.value,
      newDurationSec,
      Date.now(),
      snapshot.value,
      confirmComplete,
    )
    if (result.completesImmediately && !confirmComplete) {
      return { applied: false, completesImmediately: true }
    }
    applyResult(result)
    return { applied: true, completesImmediately: result.completesImmediately }
  }

  return {
    state,
    reminderCount,
    idleGateError,
    fill,
    waveTopPercent,
    timeText,
    phase,
    phaseLabel,
    status,
    statusLabel,
    waveColor,
    nextAction,
    start,
    stop,
    toggle,
    applyCurrentPhaseDuration,
  }
})

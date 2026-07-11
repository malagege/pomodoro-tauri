import type { Phase, TimerState, TransitionResult } from '@/types/timer'

export interface TimerSettingsSnapshot {
  workDurationSec: number
  breakDurationSec: number
  autoStart: boolean
  manualPauseGraceSec: number
}

/** 由 deadline 與牆鐘計算剩餘秒數，為唯一的真實時間來源。 */
export function remainingFromDeadline(deadlineMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000))
}

export function initialState(workDurationSec: number, nowMs: number): TimerState {
  return {
    phase: 'work',
    status: 'running',
    durationSec: workDurationSec,
    remainingSec: workDurationSec,
    deadlineMs: nowMs + workDurationSec * 1000,
    pausedAtMs: null,
    resumeEligibleAtMs: null,
    cycle: 1,
  }
}

function gateStatusFor(phase: Phase): TimerState['status'] {
  return phase === 'work' ? 'awaiting_work_activity' : 'awaiting_break_idle'
}

/** 階段完成（只能由呼叫端保證每階段呼叫一次）。 */
export function completePhase(state: TimerState, settings: TimerSettingsSnapshot): TransitionResult {
  if (state.phase === 'work') {
    return {
      state: {
        ...state,
        phase: 'break',
        status: settings.autoStart ? 'awaiting_break_idle' : 'paused',
        durationSec: settings.breakDurationSec,
        remainingSec: settings.breakDurationSec,
        deadlineMs: null,
        pausedAtMs: null,
        resumeEligibleAtMs: null,
      },
      events: ['workCompleted'],
    }
  }
  return {
    state: {
      ...state,
      phase: 'work',
      status: settings.autoStart ? 'awaiting_work_activity' : 'paused',
      durationSec: settings.workDurationSec,
      remainingSec: settings.workDurationSec,
      deadlineMs: null,
      pausedAtMs: null,
      resumeEligibleAtMs: null,
      cycle: state.cycle + 1,
    },
    events: ['breakCompleted'],
  }
}

/**
 * 每次 scheduler 更新呼叫。處理：
 * - paused_grace 寬限到期 → 依 phase 進入 idle/activity gate
 * - running 依 deadline 校正剩餘時間；跨過 deadline 時完成階段（一次）
 */
export function tick(state: TimerState, nowMs: number, settings: TimerSettingsSnapshot): TransitionResult {
  if (state.status === 'paused_grace') {
    if (state.resumeEligibleAtMs !== null && nowMs >= state.resumeEligibleAtMs) {
      return {
        state: { ...state, status: gateStatusFor(state.phase), resumeEligibleAtMs: null },
        events: [],
      }
    }
    return { state, events: [] }
  }

  if (state.status !== 'running' || state.deadlineMs === null) {
    return { state, events: [] }
  }

  const remaining = remainingFromDeadline(state.deadlineMs, nowMs)
  if (remaining <= 0) {
    return completePhase({ ...state, remainingSec: 0, deadlineMs: null }, settings)
  }
  if (remaining === state.remainingSec) {
    return { state, events: [] }
  }
  return { state: { ...state, remainingSec: remaining }, events: [] }
}

/** 手動暫停：立即停止倒數。autoStart 開啟時進入寬限，否則進入無限期 paused。 */
export function pause(state: TimerState, nowMs: number, settings: TimerSettingsSnapshot): TimerState {
  if (state.status !== 'running') return state
  const remaining =
    state.deadlineMs !== null ? remainingFromDeadline(state.deadlineMs, nowMs) : state.remainingSec
  return {
    ...state,
    status: settings.autoStart ? 'paused_grace' : 'paused',
    remainingSec: remaining,
    deadlineMs: null,
    pausedAtMs: nowMs,
    resumeEligibleAtMs: settings.autoStart ? nowMs + settings.manualPauseGraceSec * 1000 : null,
  }
}

/** 手動繼續：paused / paused_grace / awaiting 皆可立即回到 running。 */
export function resume(state: TimerState, nowMs: number): TransitionResult {
  if (state.status === 'running') return { state, events: [] }
  return {
    state: {
      ...state,
      status: 'running',
      deadlineMs: nowMs + state.remainingSec * 1000,
      pausedAtMs: null,
      resumeEligibleAtMs: null,
    },
    events: [state.phase === 'work' ? 'workStarted' : 'breakStarted'],
  }
}

/**
 * idle 輪詢結果進入狀態機：
 * - awaiting_break_idle：閒置達門檻 → 開始休息倒數
 * - awaiting_work_activity：偵測到活動（閒置低於門檻）→ 開始工作倒數
 */
export function idleSample(
  state: TimerState,
  idleSec: number,
  idleThresholdSec: number,
  nowMs: number,
): TransitionResult {
  if (state.status === 'awaiting_break_idle' && idleSec >= idleThresholdSec) {
    return resume(state, nowMs)
  }
  if (state.status === 'awaiting_work_activity' && idleSec < idleThresholdSec) {
    return resume(state, nowMs)
  }
  return { state, events: [] }
}

export interface ApplyDurationResult extends TransitionResult {
  /** true 表示新時長 <= 已經過時間，套用會使本階段立即完成（呼叫端需先確認） */
  completesImmediately: boolean
}

/** 計算「立即套用本輪」後的剩餘秒數（spec 5.4）。 */
export function computeNewRemaining(oldDurationSec: number, oldRemainingSec: number, newDurationSec: number): number {
  const elapsedSec = Math.max(0, oldDurationSec - oldRemainingSec)
  return Math.max(0, newDurationSec - elapsedSec)
}

/**
 * 立即套用新時長到目前階段，保留已經過時間。
 * 若 newRemaining 為 0，需由呼叫端先取得使用者確認，confirmComplete=true 才會經正常 completion 完成一次。
 */
export function applyDurationToCurrentPhase(
  state: TimerState,
  newDurationSec: number,
  nowMs: number,
  settings: TimerSettingsSnapshot,
  confirmComplete = false,
): ApplyDurationResult {
  const newRemainingSec = computeNewRemaining(state.durationSec, state.remainingSec, newDurationSec)

  if (newRemainingSec <= 0) {
    if (!confirmComplete) {
      return { state, events: [], completesImmediately: true }
    }
    const completed = completePhase(
      { ...state, durationSec: newDurationSec, remainingSec: 0, deadlineMs: null },
      settings,
    )
    return { ...completed, completesImmediately: true }
  }

  const next: TimerState = {
    ...state,
    durationSec: newDurationSec,
    remainingSec: newRemainingSec,
    deadlineMs: state.status === 'running' ? nowMs + newRemainingSec * 1000 : null,
  }
  return { state: next, events: [], completesImmediately: false }
}

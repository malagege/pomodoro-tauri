import { describe, expect, it } from 'vitest'
import {
  applyDurationToCurrentPhase,
  completePhase,
  computeNewRemaining,
  idleSample,
  initialState,
  pause,
  remainingFromDeadline,
  resume,
  tick,
  type TimerSettingsSnapshot,
} from '@/domain/timerStateMachine'
import type { TimerState } from '@/types/timer'

const SETTINGS: TimerSettingsSnapshot = {
  workDurationSec: 1500,
  breakDurationSec: 300,
  autoStart: true,
  manualPauseGraceSec: 60,
}

const T0 = 1_000_000

describe('initialState', () => {
  it('啟動即進入 work/running 並設定 deadline', () => {
    const s = initialState(1500, T0)
    expect(s.phase).toBe('work')
    expect(s.status).toBe('running')
    expect(s.remainingSec).toBe(1500)
    expect(s.deadlineMs).toBe(T0 + 1_500_000)
    expect(s.cycle).toBe(1)
  })
})

describe('deadline 校正（AC-05）', () => {
  it('renderer 停滯 30 秒後依 deadline 顯示約 30 秒', () => {
    const s = initialState(60, T0)
    // 30 秒未更新
    const { state } = tick(s, T0 + 30_000, SETTINGS)
    expect(state.remainingSec).toBe(30)
  })

  it('remainingFromDeadline 用 ceil 且不為負', () => {
    expect(remainingFromDeadline(T0 + 1500, T0)).toBe(2)
    expect(remainingFromDeadline(T0 - 1000, T0)).toBe(0)
  })
})

describe('階段完成', () => {
  it('工作完成 → break / awaiting_break_idle，波浪基準連續', () => {
    const s = initialState(60, T0)
    const { state, events } = tick(s, T0 + 60_000, SETTINGS)
    expect(state.phase).toBe('break')
    expect(state.status).toBe('awaiting_break_idle')
    expect(state.durationSec).toBe(300)
    expect(state.remainingSec).toBe(300)
    expect(state.deadlineMs).toBeNull()
    expect(events).toEqual(['workCompleted'])
  })

  it('autoStart 關閉時工作完成 → paused', () => {
    const s = initialState(60, T0)
    const { state } = tick(s, T0 + 60_000, { ...SETTINGS, autoStart: false })
    expect(state.status).toBe('paused')
  })

  it('休息完成 → work / awaiting_work_activity，cycle +1', () => {
    const breakRunning: TimerState = {
      ...initialState(60, T0),
      phase: 'break',
      durationSec: 300,
      remainingSec: 300,
      deadlineMs: T0 + 300_000,
    }
    const { state, events } = tick(breakRunning, T0 + 300_000, SETTINGS)
    expect(state.phase).toBe('work')
    expect(state.status).toBe('awaiting_work_activity')
    expect(state.remainingSec).toBe(1500)
    expect(state.cycle).toBe(2)
    expect(events).toEqual(['breakCompleted'])
  })

  it('同一階段只完成一次：完成後不再是 running，重複 tick 不會再完成', () => {
    const s = initialState(60, T0)
    const first = tick(s, T0 + 60_000, SETTINGS)
    expect(first.events).toEqual(['workCompleted'])
    const second = tick(first.state, T0 + 61_000, SETTINGS)
    expect(second.events).toEqual([])
    expect(second.state).toEqual(first.state)
  })
})

describe('暫停與繼續（AC-04）', () => {
  it('剩 1 秒時暫停：階段不得完成，剩餘時間不變', () => {
    const s = initialState(60, T0)
    const paused = pause(s, T0 + 59_000, SETTINGS)
    expect(paused.status).toBe('paused_grace')
    expect(paused.remainingSec).toBe(1)
    expect(paused.deadlineMs).toBeNull()
    // 寬限期內 tick 不完成、不通知
    const { state, events } = tick(paused, T0 + 90_000, SETTINGS)
    expect(events).toEqual([])
    expect(state.remainingSec).toBe(1)
  })

  it('暫停與繼續不損失秒數', () => {
    const s = initialState(100, T0)
    const paused = pause(s, T0 + 40_000, SETTINGS) // 剩 60
    expect(paused.remainingSec).toBe(60)
    const { state } = resume(paused, T0 + 500_000)
    expect(state.status).toBe('running')
    expect(state.deadlineMs).toBe(T0 + 500_000 + 60_000)
  })

  it('autoStart 關閉時暫停 → 無限期 paused', () => {
    const s = initialState(100, T0)
    const paused = pause(s, T0 + 1_000, { ...SETTINGS, autoStart: false })
    expect(paused.status).toBe('paused')
    expect(paused.resumeEligibleAtMs).toBeNull()
    const { state } = tick(paused, T0 + 999_000, { ...SETTINGS, autoStart: false })
    expect(state.status).toBe('paused')
  })

  it('寬限結束後工作階段進入 awaiting_work_activity', () => {
    const s = initialState(100, T0)
    const paused = pause(s, T0, SETTINGS)
    const { state } = tick(paused, T0 + 60_000, SETTINGS)
    expect(state.status).toBe('awaiting_work_activity')
  })

  it('寬限結束後休息階段進入 awaiting_break_idle', () => {
    const breakRunning: TimerState = {
      ...initialState(100, T0),
      phase: 'break',
      durationSec: 300,
      remainingSec: 300,
      deadlineMs: T0 + 300_000,
    }
    const paused = pause(breakRunning, T0, SETTINGS)
    const { state } = tick(paused, T0 + 60_000, SETTINGS)
    expect(state.status).toBe('awaiting_break_idle')
  })

  it('寬限期間可手動繼續', () => {
    const s = initialState(100, T0)
    const paused = pause(s, T0, SETTINGS)
    const { state, events } = resume(paused, T0 + 10_000)
    expect(state.status).toBe('running')
    expect(events).toEqual(['workStarted'])
  })
})

describe('idle/activity gate（spec 6）', () => {
  it('awaiting_break_idle：閒置達門檻開始休息', () => {
    const s = initialState(60, T0)
    const awaiting = tick(s, T0 + 60_000, SETTINGS).state
    const stillActive = idleSample(awaiting, 10, 60, T0 + 70_000)
    expect(stillActive.state.status).toBe('awaiting_break_idle')
    const idle = idleSample(awaiting, 60, 60, T0 + 130_000)
    expect(idle.state.status).toBe('running')
    expect(idle.state.phase).toBe('break')
    expect(idle.events).toEqual(['breakStarted'])
    expect(idle.state.deadlineMs).toBe(T0 + 130_000 + 300_000)
  })

  it('awaiting_work_activity：偵測到活動開始工作', () => {
    const breakDone: TimerState = {
      ...initialState(60, T0),
      phase: 'work',
      status: 'awaiting_work_activity',
      durationSec: 1500,
      remainingSec: 1500,
      deadlineMs: null,
    }
    const stillIdle = idleSample(breakDone, 120, 60, T0)
    expect(stillIdle.state.status).toBe('awaiting_work_activity')
    const active = idleSample(breakDone, 3, 60, T0)
    expect(active.state.status).toBe('running')
    expect(active.events).toEqual(['workStarted'])
  })
})

describe('修改時間設定（spec 5.4 / AC-14）', () => {
  it('computeNewRemaining 保留已經過時間', () => {
    expect(computeNewRemaining(1500, 900, 1800)).toBe(1200)
    expect(computeNewRemaining(1500, 900, 300)).toBe(0)
  })

  it('running：1500 剩 900 改 1800 → 剩 1200 並重建 deadline，不發通知', () => {
    const s: TimerState = { ...initialState(1500, T0), remainingSec: 900, deadlineMs: T0 + 900_000 }
    const r = applyDurationToCurrentPhase(s, 1800, T0, SETTINGS)
    expect(r.completesImmediately).toBe(false)
    expect(r.state.durationSec).toBe(1800)
    expect(r.state.remainingSec).toBe(1200)
    expect(r.state.deadlineMs).toBe(T0 + 1_200_000)
    expect(r.events).toEqual([])
  })

  it('paused：更新剩餘時間但不建立 deadline', () => {
    const s: TimerState = {
      ...initialState(1500, T0),
      status: 'paused',
      remainingSec: 900,
      deadlineMs: null,
    }
    const r = applyDurationToCurrentPhase(s, 1800, T0, SETTINGS)
    expect(r.state.remainingSec).toBe(1200)
    expect(r.state.deadlineMs).toBeNull()
    expect(r.state.status).toBe('paused')
  })

  it('awaiting：elapsed 0，更新為完整新時長並保持 gate 狀態', () => {
    const s: TimerState = {
      ...initialState(1500, T0),
      phase: 'break',
      status: 'awaiting_break_idle',
      durationSec: 300,
      remainingSec: 300,
      deadlineMs: null,
    }
    const r = applyDurationToCurrentPhase(s, 600, T0, SETTINGS)
    expect(r.state.remainingSec).toBe(600)
    expect(r.state.status).toBe('awaiting_break_idle')
  })

  it('新時長 <= 已經過時間：未確認前不改變任何狀態', () => {
    const s: TimerState = { ...initialState(1500, T0), remainingSec: 900, deadlineMs: T0 + 900_000 }
    const r = applyDurationToCurrentPhase(s, 300, T0, SETTINGS)
    expect(r.completesImmediately).toBe(true)
    expect(r.state).toEqual(s)
    expect(r.events).toEqual([])
  })

  it('確認後經正常 completion 完成一次', () => {
    const s: TimerState = { ...initialState(1500, T0), remainingSec: 900, deadlineMs: T0 + 900_000 }
    const r = applyDurationToCurrentPhase(s, 300, T0, SETTINGS, true)
    expect(r.completesImmediately).toBe(true)
    expect(r.events).toEqual(['workCompleted'])
    expect(r.state.phase).toBe('break')
    expect(r.state.status).toBe('awaiting_break_idle')
  })
})

describe('completePhase', () => {
  it('工作完成波浪基準連續：break 起點 remaining=duration（fill 100）', () => {
    const s = initialState(60, T0)
    const { state } = completePhase(s, SETTINGS)
    expect(state.remainingSec).toBe(state.durationSec)
  })
})

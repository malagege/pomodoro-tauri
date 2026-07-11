export type Phase = 'work' | 'break'

export type TimerStatus =
  | 'running'
  | 'paused'
  | 'paused_grace'
  | 'awaiting_break_idle'
  | 'awaiting_work_activity'

export interface TimerState {
  phase: Phase
  status: TimerStatus
  /** 本階段開始時的時長 snapshot（秒），與設定中的 duration 分離 */
  durationSec: number
  remainingSec: number
  /** running 時的牆鐘截止時間；非 running 為 null */
  deadlineMs: number | null
  pausedAtMs: number | null
  /** paused_grace 寬限結束時間 */
  resumeEligibleAtMs: number | null
  cycle: number
}

/** 狀態機對外發出的事件，由 engine 轉成通知／提醒窗行為 */
export type TimerEvent =
  | 'workCompleted'
  | 'breakCompleted'
  | 'workStarted'
  | 'breakStarted'

export interface TransitionResult {
  state: TimerState
  events: TimerEvent[]
}

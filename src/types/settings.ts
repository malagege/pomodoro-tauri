export interface AppSettings {
  schemaVersion: 1
  workDurationSec: number
  breakDurationSec: number
  idleThresholdSec: number
  reminderRepeatSec: number
  autoStart: boolean
  manualPauseGraceSec: number
  alwaysOnTop: boolean
  workWaveColor: string
  breakWaveColor: string
  workMessage: string
  breakMessage: string
  autoCheckUpdates: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  schemaVersion: 1,
  workDurationSec: 1500,
  breakDurationSec: 300,
  idleThresholdSec: 60,
  reminderRepeatSec: 60,
  autoStart: true,
  manualPauseGraceSec: 60,
  alwaysOnTop: true,
  workWaveColor: '#ADFF2F',
  breakWaveColor: '#ADFF2F',
  workMessage: '休息結束，回來工作囉！',
  breakMessage: '工作時間結束，休息一下、喝口水吧！',
  autoCheckUpdates: true,
}

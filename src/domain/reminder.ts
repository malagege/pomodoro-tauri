export interface WorkArea {
  width: number
  height: number
}

export const REMINDER_BASE_WIDTH = 600
export const REMINDER_BASE_HEIGHT = 300

/**
 * 漸進放大（spec 8.3）：前兩次維持 600×300，第 3 次起逐次放大，
 * 上限為目前螢幕工作區的 90%。
 */
export function reminderWindowSize(reminderCount: number, workArea: WorkArea): { width: number; height: number } {
  const growthStep = Math.max(0, reminderCount - 2)
  return {
    width: Math.min(REMINDER_BASE_WIDTH + growthStep * 120, Math.floor(workArea.width * 0.9)),
    height: Math.min(REMINDER_BASE_HEIGHT + growthStep * 60, Math.floor(workArea.height * 0.9)),
  }
}

/** 背景色隨提醒次數逐次加強（spec 8.3）。 */
export function reminderBackground(reminderCount: number): string {
  if (reminderCount >= 5) return '#FF9800'
  switch (Math.max(1, reminderCount)) {
    case 1:
      return '#FFF8E1'
    case 2:
      return '#FFECB3'
    case 3:
      return '#FFE082'
    default:
      return '#FFCA28'
  }
}

/** 所有等級的背景都足夠亮，統一搭配深色文字以通過對比檢查。 */
export function reminderTextColor(_reminderCount: number): string {
  return '#212121'
}

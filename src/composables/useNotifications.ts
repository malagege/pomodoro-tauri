import { isTauri } from '@/adapters/env'
import {
  REMINDER_BASE_HEIGHT,
  REMINDER_BASE_WIDTH,
  reminderBackground,
  reminderTextColor,
  reminderWindowSize,
  type WorkArea,
} from '@/domain/reminder'

export interface ReminderPayload {
  message: string
  background: string
  textColor: string
}

const NOTIFICATION_TITLE = 'Pomodoro'
const REMINDER_LABEL = 'reminder'

let latestPayload: ReminderPayload | null = null
let readyListenerStarted = false

/** 系統通知；權限被拒或失敗時回傳 false，由自訂提醒窗作為 fallback（AC-09）。 */
async function sendSystemNotification(body: string): Promise<boolean> {
  if (!isTauri()) return false
  try {
    const { isPermissionGranted, requestPermission, sendNotification } = await import(
      '@tauri-apps/plugin-notification'
    )
    let granted = await isPermissionGranted()
    if (!granted) {
      granted = (await requestPermission()) === 'granted'
    }
    if (!granted) return false
    sendNotification({ title: NOTIFICATION_TITLE, body })
    return true
  } catch (err) {
    console.warn('[notify] 系統通知失敗，改用自訂提醒窗:', err)
    return false
  }
}

async function getLogicalWorkArea(): Promise<WorkArea> {
  try {
    const { currentMonitor } = await import('@tauri-apps/api/window')
    const monitor = await currentMonitor()
    if (monitor) {
      const area = monitor.workArea?.size ?? monitor.size
      return {
        width: Math.floor(area.width / monitor.scaleFactor),
        height: Math.floor(area.height / monitor.scaleFactor),
      }
    }
  } catch (err) {
    console.warn('[notify] 無法取得螢幕工作區，使用預設大小:', err)
  }
  return { width: 1280, height: 720 }
}

/** 主視窗啟動時註冊：提醒窗載入完成後回報 ready，補送最新 payload。 */
export async function startReminderReadyListener(): Promise<void> {
  if (!isTauri() || readyListenerStarted) return
  readyListenerStarted = true
  const { listen, emitTo } = await import('@tauri-apps/api/event')
  await listen('reminder-ready', () => {
    if (latestPayload) void emitTo(REMINDER_LABEL, 'reminder-update', latestPayload)
  })
}

/**
 * 顯示或更新單一實例的自訂提醒窗（spec 8.2/8.3）。
 * kind='break' 的重複提醒依 reminderCount 漸進放大；kind='work' 固定 600×300。
 */
async function showReminderWindow(kind: 'work' | 'break', message: string, reminderCount: number): Promise<void> {
  if (!isTauri()) {
    console.info(`[reminder fallback] ${message}`)
    return
  }
  const workArea = await getLogicalWorkArea()
  const size =
    kind === 'break'
      ? reminderWindowSize(reminderCount, workArea)
      : {
          width: Math.min(REMINDER_BASE_WIDTH, Math.floor(workArea.width * 0.9)),
          height: Math.min(REMINDER_BASE_HEIGHT, Math.floor(workArea.height * 0.9)),
        }
  const payload: ReminderPayload = {
    message,
    background: reminderBackground(kind === 'break' ? Math.max(1, reminderCount) : 1),
    textColor: reminderTextColor(reminderCount),
  }
  latestPayload = payload

  const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
  const { LogicalSize } = await import('@tauri-apps/api/dpi')
  const { emitTo } = await import('@tauri-apps/api/event')

  const existing = await WebviewWindow.getByLabel(REMINDER_LABEL)
  if (existing) {
    try {
      await existing.setSize(new LogicalSize(size.width, size.height))
      await existing.center()
      await existing.show()
      await existing.setFocus()
      await emitTo(REMINDER_LABEL, 'reminder-update', payload)
      return
    } catch (err) {
      console.warn('[reminder] 更新既有提醒窗失敗，重新建立:', err)
    }
  }

  const win = new WebviewWindow(REMINDER_LABEL, {
    url: 'index.html#/reminder',
    title: 'Pomodoro 提醒',
    width: size.width,
    height: size.height,
    center: true,
    decorations: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    focus: true,
  })
  win.once('tauri://error', (e) => {
    console.error('[reminder] 建立提醒窗失敗:', e)
  })
}

/** 發送一次階段提醒：系統通知 + 自訂提醒窗（同一事件只呼叫一次）。 */
export async function sendPhaseReminder(
  kind: 'work' | 'break',
  message: string,
  reminderCount: number,
): Promise<void> {
  await sendSystemNotification(message)
  await showReminderWindow(kind, message, reminderCount)
}

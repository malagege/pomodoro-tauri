import { DEFAULT_SETTINGS, type AppSettings } from '@/types/settings'

export type SettingsErrors = Partial<Record<keyof AppSettings, string>>

const COLOR_RE = /^#[0-9a-fA-F]{6}$/

interface IntRule {
  min: number
  max: number
  label: string
}

const INT_RULES: Partial<Record<keyof AppSettings, IntRule>> = {
  workDurationSec: { min: 1, max: 86_400, label: '工作時間' },
  breakDurationSec: { min: 1, max: 86_400, label: '休息時間' },
  idleThresholdSec: { min: 1, max: 3_600, label: '閒置門檻' },
  reminderRepeatSec: { min: 5, max: 3_600, label: '提醒重複間隔' },
  manualPauseGraceSec: { min: 5, max: 3_600, label: '手動暫停寬限' },
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && Number.isFinite(value)
}

function validateInt(value: unknown, rule: IntRule): string | null {
  if (!isPositiveInt(value)) return `${rule.label}必須是整數秒`
  if (value < rule.min || value > rule.max) {
    return `${rule.label}必須介於 ${rule.min}–${rule.max} 秒`
  }
  return null
}

function validateMessage(value: unknown, label: string): string | null {
  if (typeof value !== 'string') return `${label}必須是文字`
  const trimmed = value.trim()
  if (trimmed.length < 1 || trimmed.length > 200) return `${label}長度需為 1–200 字元`
  return null
}

function validateColor(value: unknown, label: string): string | null {
  if (typeof value !== 'string' || !COLOR_RE.test(value)) return `${label}必須是 #RRGGBB 格式`
  return null
}

/** 驗證整份設定草稿；回傳每個欄位的錯誤訊息，空物件代表全部合法。 */
export function validateSettings(draft: Partial<AppSettings>): SettingsErrors {
  const errors: SettingsErrors = {}

  for (const [field, rule] of Object.entries(INT_RULES) as [keyof AppSettings, IntRule][]) {
    const err = validateInt(draft[field], rule)
    if (err) errors[field] = err
  }

  const workColorErr = validateColor(draft.workWaveColor, '工作波浪顏色')
  if (workColorErr) errors.workWaveColor = workColorErr
  const breakColorErr = validateColor(draft.breakWaveColor, '休息波浪顏色')
  if (breakColorErr) errors.breakWaveColor = breakColorErr

  const workMsgErr = validateMessage(draft.workMessage, '工作提醒文字')
  if (workMsgErr) errors.workMessage = workMsgErr
  const breakMsgErr = validateMessage(draft.breakMessage, '休息提醒文字')
  if (breakMsgErr) errors.breakMessage = breakMsgErr

  for (const field of ['autoStart', 'alwaysOnTop', 'autoCheckUpdates'] as const) {
    if (typeof draft[field] !== 'boolean') errors[field] = '必須是布林值'
  }

  return errors
}

export interface NormalizeResult {
  settings: AppSettings
  /** 被回退成預設值的欄位，供診斷 log 使用 */
  fallbackFields: string[]
}

/**
 * 載入持久化設定：逐欄位驗證，不合法的欄位個別回退預設值（spec 9.6）。
 */
export function normalizeSettings(raw: unknown): NormalizeResult {
  const fallbackFields: string[] = []
  const result: AppSettings = { ...DEFAULT_SETTINGS }

  if (typeof raw !== 'object' || raw === null) {
    return { settings: result, fallbackFields: ['<all>'] }
  }

  const candidate = { ...DEFAULT_SETTINGS, ...(raw as Record<string, unknown>) }
  candidate.schemaVersion = 1
  const errors = validateSettings(candidate as Partial<AppSettings>)

  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[]) {
    if (key === 'schemaVersion') continue
    if (errors[key] !== undefined || (raw as Record<string, unknown>)[key] === undefined) {
      if ((raw as Record<string, unknown>)[key] !== undefined) fallbackFields.push(key)
      continue
    }
    ;(result as unknown as Record<string, unknown>)[key] = candidate[key]
  }

  // 提醒文字保存時先 trim
  result.workMessage = result.workMessage.trim()
  result.breakMessage = result.breakMessage.trim()

  return { settings: result, fallbackFields }
}

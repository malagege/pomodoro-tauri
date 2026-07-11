import { describe, expect, it } from 'vitest'
import { normalizeSettings, validateSettings } from '@/domain/validation'
import { DEFAULT_SETTINGS } from '@/types/settings'

describe('validateSettings', () => {
  it('預設值全部合法', () => {
    expect(validateSettings(DEFAULT_SETTINGS)).toEqual({})
  })

  it('拒絕字串、NaN、負數與超出範圍', () => {
    expect(validateSettings({ ...DEFAULT_SETTINGS, workDurationSec: '1500' as unknown as number }).workDurationSec).toBeTruthy()
    expect(validateSettings({ ...DEFAULT_SETTINGS, workDurationSec: NaN }).workDurationSec).toBeTruthy()
    expect(validateSettings({ ...DEFAULT_SETTINGS, workDurationSec: -1 }).workDurationSec).toBeTruthy()
    expect(validateSettings({ ...DEFAULT_SETTINGS, workDurationSec: 86_401 }).workDurationSec).toBeTruthy()
    expect(validateSettings({ ...DEFAULT_SETTINGS, workDurationSec: 0 }).workDurationSec).toBeTruthy()
    expect(validateSettings({ ...DEFAULT_SETTINGS, reminderRepeatSec: 4 }).reminderRepeatSec).toBeTruthy()
    expect(validateSettings({ ...DEFAULT_SETTINGS, manualPauseGraceSec: 3_601 }).manualPauseGraceSec).toBeTruthy()
  })

  it('顏色需為 #RRGGBB', () => {
    expect(validateSettings({ ...DEFAULT_SETTINGS, workWaveColor: 'greenyellow' }).workWaveColor).toBeTruthy()
    expect(validateSettings({ ...DEFAULT_SETTINGS, workWaveColor: '#ADFF2F' }).workWaveColor).toBeUndefined()
  })

  it('提醒文字 trim 後 1–200 字元', () => {
    expect(validateSettings({ ...DEFAULT_SETTINGS, workMessage: '   ' }).workMessage).toBeTruthy()
    expect(validateSettings({ ...DEFAULT_SETTINGS, breakMessage: 'a'.repeat(201) }).breakMessage).toBeTruthy()
  })
})

describe('normalizeSettings（載入與 migration）', () => {
  it('完全無法解析時回退全部預設值', () => {
    const r = normalizeSettings(null)
    expect(r.settings).toEqual(DEFAULT_SETTINGS)
    expect(r.fallbackFields).toEqual(['<all>'])
  })

  it('只回退不合法欄位，合法欄位保留', () => {
    const r = normalizeSettings({ workDurationSec: -5, breakDurationSec: 600 })
    expect(r.settings.workDurationSec).toBe(DEFAULT_SETTINGS.workDurationSec)
    expect(r.settings.breakDurationSec).toBe(600)
    expect(r.fallbackFields).toContain('workDurationSec')
  })

  it('缺少的欄位補預設值且不列入 fallback', () => {
    const r = normalizeSettings({ workDurationSec: 3000 })
    expect(r.settings.workDurationSec).toBe(3000)
    expect(r.settings.breakDurationSec).toBe(DEFAULT_SETTINGS.breakDurationSec)
    expect(r.fallbackFields).toEqual([])
  })
})

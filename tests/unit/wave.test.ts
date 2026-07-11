import { describe, expect, it } from 'vitest'
import { fillPercent, legacyTopPercent } from '@/domain/wave'

describe('fillPercent', () => {
  it('工作：開始 0、一半 50、結束 100', () => {
    expect(fillPercent('work', 100, 100)).toBe(0)
    expect(fillPercent('work', 100, 50)).toBe(50)
    expect(fillPercent('work', 100, 0)).toBe(100)
  })

  it('休息：開始 100、一半 50、結束 0', () => {
    expect(fillPercent('break', 100, 100)).toBe(100)
    expect(fillPercent('break', 100, 50)).toBe(50)
    expect(fillPercent('break', 100, 0)).toBe(0)
  })

  it('clamp 在 0–100，異常輸入回退 0 而非 NaN', () => {
    expect(fillPercent('work', 100, 150)).toBe(0)
    expect(fillPercent('work', 100, -10)).toBe(100)
    expect(fillPercent('work', 0, 50)).toBe(0)
    expect(fillPercent('break', 0, 0)).toBe(0)
    expect(fillPercent('work', NaN, 10)).toBe(0)
    expect(fillPercent('work', 100, NaN)).toBe(0)
    expect(fillPercent('break', -5, 3)).toBe(0)
  })
})

describe('legacyTopPercent（spec 7.4 相容公式）', () => {
  it('在 0、49、50、51、100 的結果', () => {
    expect(legacyTopPercent(0)).toBe(95)
    expect(legacyTopPercent(49)).toBe(46)
    expect(legacyTopPercent(50)).toBe(50)
    expect(legacyTopPercent(51)).toBe(49)
    expect(legacyTopPercent(100)).toBe(0)
  })
})

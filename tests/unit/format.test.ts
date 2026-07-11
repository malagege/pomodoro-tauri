import { describe, expect, it } from 'vitest'
import { formatMMSS } from '@/domain/format'

describe('formatMMSS', () => {
  it('固定兩位分鐘與兩位秒數', () => {
    expect(formatMMSS(1500)).toBe('25:00')
    expect(formatMMSS(249)).toBe('04:09')
    expect(formatMMSS(0)).toBe('00:00')
  })

  it('負數與非數值回 00:00', () => {
    expect(formatMMSS(-5)).toBe('00:00')
    expect(formatMMSS(NaN)).toBe('00:00')
  })

  it('超過 99 分鐘仍完整顯示', () => {
    expect(formatMMSS(86_400)).toBe('1440:00')
  })
})

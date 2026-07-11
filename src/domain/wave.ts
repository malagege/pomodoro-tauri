import type { Phase } from '@/types/timer'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * 波浪填充百分比，一律 clamp 在 0–100。
 * 工作：由 0 上升到 100；休息：由 100 下降到 0。
 * durationSec 不合法時回退 0，不得輸出 NaN。
 */
export function fillPercent(phase: Phase, durationSec: number, remainingSec: number): number {
  if (!Number.isFinite(durationSec) || durationSec <= 0 || !Number.isFinite(remainingSec)) {
    return 0
  }
  const remaining = clamp(remainingSec, 0, durationSec)
  const pct =
    phase === 'work'
      ? ((durationSec - remaining) / durationSec) * 100
      : (remaining / durationSec) * 100
  return clamp(pct, 0, 100)
}

/**
 * 舊版垂直校正（spec 7.4）：fillPercent < 50 時額外下移 5 個百分點。
 * 這是刻意保留的相容行為，不是 bug。
 */
export function legacyTopPercent(fill: number): number {
  const f = clamp(fill, 0, 100)
  return 100 - f - (f < 50 ? 5 : 0)
}

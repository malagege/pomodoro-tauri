/** 以 MM:SS 顯示剩餘秒數；分鐘至少兩位，可超過 99 分。 */
export function formatMMSS(totalSec: number): string {
  const sec = Number.isFinite(totalSec) ? Math.max(0, Math.floor(totalSec)) : 0
  const minutes = Math.floor(sec / 60)
  const seconds = sec % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

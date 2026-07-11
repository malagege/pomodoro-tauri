import { describe, expect, it } from 'vitest'
import { reminderBackground, reminderWindowSize } from '@/domain/reminder'

const AREA = { width: 1920, height: 1080 }

describe('reminderWindowSize（spec 8.3）', () => {
  it('前兩次維持 600×300', () => {
    expect(reminderWindowSize(1, AREA)).toEqual({ width: 600, height: 300 })
    expect(reminderWindowSize(2, AREA)).toEqual({ width: 600, height: 300 })
  })

  it('第 3 次起逐次放大', () => {
    expect(reminderWindowSize(3, AREA)).toEqual({ width: 720, height: 360 })
    expect(reminderWindowSize(4, AREA)).toEqual({ width: 840, height: 420 })
    expect(reminderWindowSize(5, AREA)).toEqual({ width: 960, height: 480 })
  })

  it('不超過工作區 90%', () => {
    const small = { width: 800, height: 600 }
    const size = reminderWindowSize(50, small)
    expect(size.width).toBe(720)
    expect(size.height).toBe(540)
  })
})

describe('reminderBackground 色階', () => {
  it('依次數逐次加強', () => {
    expect(reminderBackground(1)).toBe('#FFF8E1')
    expect(reminderBackground(2)).toBe('#FFECB3')
    expect(reminderBackground(3)).toBe('#FFE082')
    expect(reminderBackground(4)).toBe('#FFCA28')
    expect(reminderBackground(5)).toBe('#FF9800')
    expect(reminderBackground(9)).toBe('#FF9800')
  })
})

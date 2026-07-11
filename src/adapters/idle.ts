import { invoke } from '@tauri-apps/api/core'
import { isTauri } from './env'

/** 前端只依賴這個介面，不知道平台實作（spec 6.4）。 */
export interface IdleTimeProvider {
  getIdleSeconds(): Promise<number>
}

export const idleProvider: IdleTimeProvider = {
  async getIdleSeconds(): Promise<number> {
    if (!isTauri()) {
      throw new Error('目前環境不支援系統閒置偵測')
    }
    const value = await invoke<number>('get_system_idle_seconds')
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new Error(`閒置秒數不合法: ${String(value)}`)
    }
    return Math.floor(value)
  },
}

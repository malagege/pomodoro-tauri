import { isTauri } from './env'

/** 設定持久化抽象；Tauri 使用 store plugin，其他環境退回 localStorage。 */
export interface SettingsStorage {
  load(): Promise<unknown>
  save(value: unknown): Promise<void>
}

const STORE_FILE = 'settings.json'
const STORE_KEY = 'settings'

function createTauriStorage(): SettingsStorage {
  // 動態載入，讓非 Tauri 環境（測試）不會 import 到 plugin
  const storePromise = import('@tauri-apps/plugin-store').then(
    ({ LazyStore }) => new LazyStore(STORE_FILE),
  )
  return {
    async load() {
      const store = await storePromise
      return await store.get(STORE_KEY)
    },
    async save(value: unknown) {
      const store = await storePromise
      await store.set(STORE_KEY, value)
      await store.save()
    },
  }
}

function createLocalStorage(): SettingsStorage {
  return {
    async load() {
      const raw = window.localStorage.getItem(STORE_KEY)
      if (raw === null) return undefined
      try {
        return JSON.parse(raw)
      } catch {
        return undefined
      }
    },
    async save(value: unknown) {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(value))
    },
  }
}

export function createSettingsStorage(): SettingsStorage {
  return isTauri() ? createTauriStorage() : createLocalStorage()
}

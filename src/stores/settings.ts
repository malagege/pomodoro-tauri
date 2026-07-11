import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DEFAULT_SETTINGS, type AppSettings } from '@/types/settings'
import { normalizeSettings, validateSettings } from '@/domain/validation'
import { createSettingsStorage } from '@/adapters/storage'

const SAVE_DEBOUNCE_MS = 500

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })
  const loaded = ref(false)
  const storage = createSettingsStorage()

  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let pendingSave: AppSettings | null = null

  async function load(): Promise<void> {
    try {
      const raw = await storage.load()
      const { settings: normalized, fallbackFields } = normalizeSettings(raw ?? {})
      if (fallbackFields.length > 0) {
        console.warn('[settings] 下列欄位不合法，已回退預設值:', fallbackFields)
      }
      settings.value = normalized
    } catch (err) {
      console.error('[settings] 載入失敗，使用預設值:', err)
      settings.value = { ...DEFAULT_SETTINGS }
    } finally {
      loaded.value = true
    }
  }

  function scheduleSave(value: AppSettings): void {
    pendingSave = value
    if (saveTimer !== null) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      void flush()
    }, SAVE_DEBOUNCE_MS)
  }

  /** 立即寫入（關閉設定面板時呼叫）。 */
  async function flush(): Promise<void> {
    if (saveTimer !== null) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    if (pendingSave === null) return
    const value = pendingSave
    pendingSave = null
    try {
      await storage.save(value)
    } catch (err) {
      console.error('[settings] 寫入失敗:', err)
    }
  }

  /**
   * 套用一份完整的新設定；不合法時丟出錯誤，不寫入任何欄位。
   */
  function apply(next: AppSettings): void {
    const errors = validateSettings(next)
    if (Object.keys(errors).length > 0) {
      throw new Error(`設定不合法: ${JSON.stringify(errors)}`)
    }
    const cleaned: AppSettings = {
      ...next,
      schemaVersion: 1,
      workMessage: next.workMessage.trim(),
      breakMessage: next.breakMessage.trim(),
    }
    settings.value = cleaned
    scheduleSave(cleaned)
  }

  /** 恢復預設設定：立即寫入 store（spec 9.6）。 */
  async function resetToDefaults(): Promise<void> {
    settings.value = { ...DEFAULT_SETTINGS }
    pendingSave = settings.value
    await flush()
  }

  return { settings, loaded, load, apply, flush, resetToDefaults }
})

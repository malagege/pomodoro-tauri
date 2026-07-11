import { ref } from 'vue'
import { isTauri } from '@/adapters/env'

export interface UpdateInfo {
  version: string
  notes: string
}

const checking = ref(false)
const available = ref<UpdateInfo | null>(null)
const statusText = ref('')
/** 使用者本次 session 選擇稍後更新，不再自動打擾（spec 9.7） */
let deferredThisSession = false

async function doCheck(manual: boolean): Promise<void> {
  if (!isTauri()) {
    statusText.value = '目前環境不支援更新檢查'
    return
  }
  if (!manual && deferredThisSession) return
  checking.value = true
  statusText.value = '檢查更新中…'
  try {
    const { check } = await import('@tauri-apps/plugin-updater')
    const update = await check()
    if (update) {
      available.value = { version: update.version, notes: update.body ?? '' }
      statusText.value = `發現新版本 ${update.version}`
    } else {
      available.value = null
      statusText.value = manual ? '目前已是最新版本' : ''
    }
  } catch (err) {
    // 更新失敗保留目前版本並顯示可理解的錯誤（spec 9.7）
    available.value = null
    statusText.value = manual ? `檢查更新失敗：${err instanceof Error ? err.message : String(err)}` : ''
    console.warn('[updater] 檢查更新失敗:', err)
  } finally {
    checking.value = false
  }
}

async function downloadAndInstall(): Promise<void> {
  if (!isTauri() || !available.value) return
  checking.value = true
  statusText.value = '下載更新中…'
  try {
    const { check } = await import('@tauri-apps/plugin-updater')
    const update = await check()
    if (!update) {
      statusText.value = '找不到可用更新'
      return
    }
    await update.downloadAndInstall()
    statusText.value = '更新已下載，請重新啟動應用程式完成安裝。'
  } catch (err) {
    statusText.value = `更新失敗：${err instanceof Error ? err.message : String(err)}`
  } finally {
    checking.value = false
  }
}

function deferUpdate(): void {
  deferredThisSession = true
  available.value = null
  statusText.value = ''
}

export function useUpdater() {
  return {
    checking,
    available,
    statusText,
    checkManually: () => doCheck(true),
    checkOnStartup: () => doCheck(false),
    downloadAndInstall,
    deferUpdate,
  }
}

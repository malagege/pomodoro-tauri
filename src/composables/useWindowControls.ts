import { isTauri } from '@/adapters/env'

export function useWindowControls() {
  async function minimize(): Promise<void> {
    if (!isTauri()) return
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().minimize()
  }

  /** 主視窗關閉必須完全結束程式與 timer（spec 9.4）。 */
  async function closeApp(): Promise<void> {
    if (!isTauri()) return
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('exit_app')
  }

  async function setAlwaysOnTop(value: boolean): Promise<void> {
    if (!isTauri()) return
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().setAlwaysOnTop(value)
  }

  /** 開始拖曳視窗（由 mousedown 觸發）。 */
  async function startDragging(): Promise<void> {
    if (!isTauri()) return
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().startDragging()
  }

  return { minimize, closeApp, setAlwaysOnTop, startDragging }
}

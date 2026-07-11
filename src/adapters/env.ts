/** 是否在 Tauri runtime 內執行；瀏覽器 dev／單元測試時為 false。 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

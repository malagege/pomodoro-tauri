# Pomodoro（Tauri 2 + Vue 3）

常駐桌面的波浪番茄鐘：工作時波浪由下往上升，休息時由上往下降；工作結束提醒休息，
休息結束提醒回到工作，並以系統閒置時間自動銜接工作／休息循環。

透明、無邊框、可置頂的小視窗（初始 200 × 600），設定跨重開保存。
完整規格見 [spec.md](spec.md)。

## 開發

```bash
npm install
npm run tauri dev   # 桌面應用程式
npm test            # domain 單元測試
npm run build       # 型別檢查 + 前端建置
cd src-tauri && cargo test   # Rust 測試
```

## 打包

本機打包（updater 簽章已啟用，需先指定私鑰）：

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = "$HOME\.tauri\pomodoro-updater.key"  # 路徑或私鑰內容皆可
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""
npm run tauri build
```

## 發行（CI/CD）

- **CI**（`.github/workflows/ci.yml`）：push / PR 到 `main` 自動跑前端測試、型別檢查與三平台 Rust 測試。
- **Release**（`.github/workflows/release.yml`）：**push 到 `main` 即自動觸發**（文件類變更除外），
  版號以當下 UTC 日期時間自動產生（`YY.M.D-當日分鐘數`，例如 `26.7.12-853`，沿用舊 Electron 專案格式），
  自動產生上次發佈以來的 commit 列表作為 release notes，清除舊草稿後建置
  Windows x86_64/ARM64（NSIS）、macOS x86_64/ARM64、Linux x86_64 五組安裝檔，
  以「草稿 Release」上傳，並產生應用程式內更新所需的 `latest.json` 與 `.sig`。

發行一個新版本：

```bash
git push origin main   # 就這樣，版號自動以日期時間產生
# CI 完成後到 GitHub Releases 檢查草稿，通過 smoke test 再按下 Publish
```

Publish 之後，已安裝的應用程式啟動時（或按「檢查更新」）就會收到新版本提示。
repo 內的 `version: 0.1.0` 只是佔位值，實際發行版號由 CI 注入（`scripts/set-version.mjs`）。

> Windows 只出 NSIS 安裝檔：WiX MSI 的版號格式不接受 `-853` 這種時間後綴。

首次使用前需在 GitHub repo 設定 secrets：

| Secret | 內容 |
| --- | --- |
| `TAURI_SIGNING_PRIVATE_KEY` | `~/.tauri/pomodoro-updater.key` 私鑰檔的完整內容 |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | 私鑰密碼（目前為空字串） |

## Legacy 參考

舊版為 Electron 14 + Vue 3 實作（repo：`vue-electron-Pomodoro`，
最後程式 commit `dc52a6bcc8d578b932ff785fd237c8411837f0d1`，2023-11-23）。
本版波浪視覺以舊版 `TheBackground.vue` 為相容基準（含 `fill < 50%` 時的 5% 垂直校正）。
待補：舊版工作／休息 0/25/50/75/100% 基準截圖，收錄於 `docs/legacy-reference/`。

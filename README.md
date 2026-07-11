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
- **Release**（`.github/workflows/release.yml`）：推送 `v*` tag 觸發，建置
  Windows x86_64/ARM64、macOS x86_64/ARM64、Linux x86_64 五組安裝檔，
  以「草稿 Release」上傳，並產生應用程式內更新所需的 `latest.json` 與 `.sig`。

發行一個新版本：

```bash
# 1. 更新版本號：package.json、src-tauri/tauri.conf.json、src-tauri/Cargo.toml
# 2. commit 後打 tag
git tag v0.2.0
git push origin main --tags
# 3. CI 完成後到 GitHub Releases 檢查草稿，通過 smoke test 再按下 Publish
```

Release 發佈後，已安裝的應用程式啟動時（或按「檢查更新」）就會收到新版本提示。

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

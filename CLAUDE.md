# Pomodoro Tauri 專案說明

常駐桌面的波浪番茄鐘，Tauri 2 + Vue 3 + TypeScript + Vite 重寫版。
完整產品規格見 `spec.md`（唯一規格來源，修改行為前先讀它）。

## 常用指令

| 指令 | 用途 |
| --- | --- |
| `npm run dev` | 啟動 Vite dev server（瀏覽器模式，無 Tauri API） |
| `npm run tauri dev` | 啟動完整桌面應用程式 |
| `npm run build` | vue-tsc 型別檢查 + 前端建置 |
| `npm test` | Vitest 單元測試（domain 純函式） |
| `npm run tauri build` | 打包桌面應用程式 |
| `cd src-tauri && cargo check` | Rust 後端編譯檢查 |
| `cd src-tauri && cargo test` | Rust 測試 |

## 架構重點

- `src/domain/`：純 TypeScript，無 Vue/Tauri 相依，所有計時、波浪、驗證邏輯都在這裡，單元測試在 `tests/unit/`。
  - `timerStateMachine.ts`：deadline-based 狀態機（running / paused / paused_grace / awaiting_break_idle / awaiting_work_activity）。剩餘時間一律由 `deadlineMs` 與牆鐘計算，不得用「每 tick 減 1」。
  - `wave.ts`：`fillPercent`（工作 0→100、休息 100→0）與舊版 `legacyTopPercent` 5% 校正（刻意保留的相容行為，不是 bug）。
  - `validation.ts`：設定欄位驗證與載入時逐欄位回退。
  - `reminder.ts`：漸進提醒窗尺寸與色階（第 3 次起放大，上限工作區 90%）。
- `src/stores/timer.ts`：唯一的 scheduler（250ms tick + 1s idle 輪詢），處理狀態機事件並觸發通知。
- `src/adapters/`：Tauri API 封裝（idle、storage），非 Tauri 環境自動降級，讓 domain 測試不需啟動 Tauri。
- `src-tauri/src/commands/idle_time.rs`：`get_system_idle_seconds` command，用 `user-idle` crate 跨平台取得閒置秒數。
- 提醒窗是單一實例 label=`reminder` 的 WebviewWindow，路由 `/#/reminder`，payload 走 typed event（`reminder-update`／`reminder-ready`），不得用 URL query 傳文字。
- capabilities 採最小權限：主視窗與提醒窗分開（`src-tauri/capabilities/`）。

## CI/CD 與更新（updater）

- `.github/workflows/ci.yml`：push/PR 到 main 時跑前端測試建置 + 三平台 `cargo test`。
- `.github/workflows/release.yml`：推 `v*` tag 觸發，建置五組必要 artifacts（Windows x86_64/ARM64、macOS x86_64/ARM64、Linux x86_64），以草稿 Release 上傳並產生 updater 用的 `latest.json` 與 `.sig` 簽章。
- 發行步驟：改 `package.json` 與 `src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml` 的版本號 → commit → `git tag v0.x.0 && git push origin main --tags` → CI 完成後到 GitHub 檢查草稿 Release、通過 smoke test 再發佈。發佈後應用程式的「檢查更新」就會看到新版。
- updater 公鑰在 `src-tauri/tauri.conf.json`；私鑰在 `C:\Users\steve\.tauri\pomodoro-updater.key`（不進 repo，遺失就無法再簽新版本）。
- GitHub repo 需設定 secrets：`TAURI_SIGNING_PRIVATE_KEY`（私鑰檔內容）、`TAURI_SIGNING_PRIVATE_KEY_PASSWORD`（目前為空字串）。
- `createUpdaterArtifacts` 已開啟，本機 `npm run tauri build` 需先設定：
  `$env:TAURI_SIGNING_PRIVATE_KEY="C:\Users\steve\.tauri\pomodoro-updater.key"; $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""`（變數值可為路徑或私鑰內容）
- macOS 簽章／notarize 需要 Apple Developer 憑證，secrets 名稱已列在 release.yml 註解中，待補。

## 注意事項

- `vue-electron-Pomodoro/` 是舊版 Electron 參考專案，僅供閱讀，已列入 `.gitignore`，不要修改或 commit。
- 完成任務後：跑 `npm test` 與 `npm run build` 確認通過，再 git commit。

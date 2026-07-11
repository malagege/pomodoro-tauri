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

```bash
npm run tauri build
```

updater 正式啟用前需替換 `src-tauri/tauri.conf.json` 的 endpoint、
將 `bundle.createUpdaterArtifacts` 設為 `true`，並在 CI 提供 `TAURI_SIGNING_PRIVATE_KEY`。

## Legacy 參考

舊版為 Electron 14 + Vue 3 實作（repo：`vue-electron-Pomodoro`，
最後程式 commit `dc52a6bcc8d578b932ff785fd237c8411837f0d1`，2023-11-23）。
本版波浪視覺以舊版 `TheBackground.vue` 為相容基準（含 `fill < 50%` 時的 5% 垂直校正）。
待補：舊版工作／休息 0/25/50/75/100% 基準截圖，收錄於 `docs/legacy-reference/`。

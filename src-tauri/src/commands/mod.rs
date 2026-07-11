pub mod idle_time;

/// 主視窗關閉按鈕呼叫：完全結束程式與 timer（spec 9.4）。
#[tauri::command]
pub fn exit_app(app: tauri::AppHandle) {
    app.exit(0);
}

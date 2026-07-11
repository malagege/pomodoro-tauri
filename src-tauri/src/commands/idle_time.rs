//! 系統閒置時間（spec 6.4）。
//!
//! 「閒置」的技術定義：距離目前登入 session 上一次鍵盤、滑鼠或其他系統
//! 輸入事件已經過的秒數。這只是 user-input idle 的近似值，不是人體存在偵測。
//!
//! 平台實作透過 `user-idle` crate 統一封裝：
//! - Windows: Win32 `GetLastInputInfo`
//! - macOS: Core Graphics `CGEventSourceSecondsSinceLastEventType`
//! - Linux: X11 XScreenSaver（Wayland 環境可能失敗，由前端降級為手動開始）
//!
//! 前端只依賴這個 command，不接觸平台細節；OS API 失敗時回傳 error，
//! 不可把錯誤誤當成 0 或「已閒置」。

/// Linux 實作走 X11 XScreenSaver；沒有 DISPLAY（headless、純 Wayland session）時
/// 底層 X11 呼叫會直接 segfault，必須在呼叫前擋下並回傳可辨識的錯誤，
/// 讓前端依 spec 6.3 降級為手動開始。
#[cfg(target_os = "linux")]
fn ensure_platform_supported() -> Result<(), String> {
    if std::env::var_os("DISPLAY").is_none() {
        return Err(
            "沒有可用的 X11 display（headless 或純 Wayland session），無法取得系統閒置時間"
                .to_string(),
        );
    }
    Ok(())
}

#[cfg(not(target_os = "linux"))]
fn ensure_platform_supported() -> Result<(), String> {
    Ok(())
}

/// 回傳距離最後一次使用者輸入的非負整數秒數。
#[tauri::command]
pub fn get_system_idle_seconds() -> Result<u64, String> {
    ensure_platform_supported()?;
    user_idle::UserIdle::get_time()
        .map(|idle| idle.as_seconds())
        .map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::get_system_idle_seconds;

    /// 走 command 本身（含平台防護）：headless CI 需回傳可辨識錯誤而非 crash，
    /// 成功時必須是合理的非負整數。
    #[test]
    fn idle_seconds_is_reasonable_or_recognizable_error() {
        match get_system_idle_seconds() {
            Ok(seconds) => {
                // u64 本身非負；確認不會是荒謬的巨大值（> 10 年）
                assert!(seconds < 60 * 60 * 24 * 365 * 10);
            }
            Err(error) => {
                // 失敗必須是可辨識的錯誤字串，而不是 panic 或 segfault
                assert!(!error.is_empty());
            }
        }
    }
}

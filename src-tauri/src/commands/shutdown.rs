//! 二段階シャットダウン。`window.confirm` 同様、`beforeunload` の fire-and-forget な
//! 永続化 flush は IPC 完了前にプロセスが落ち得るため、`CloseRequested` を一旦止めて
//! main-ui に flush させ、完了通知（この command）を受けてから実際に終了する。

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter};

static SHUTDOWN_REQUESTED: AtomicBool = AtomicBool::new(false);

/// `CloseRequested` から呼ぶ。close を止めて main-ui に flush を依頼すべきなら true。
/// 2 回目以降（main-ui が complete_shutdown 済み、または要求済み）は false を返し
/// そのまま閉じさせる。
pub fn should_defer_close(app: &AppHandle) -> bool {
    if SHUTDOWN_REQUESTED.swap(true, Ordering::SeqCst) {
        return false;
    }
    // main-ui が落ちていて emit できない場合は defer せずそのまま閉じる
    app.emit_to("main-ui", "app://close-requested", ()).is_ok()
}

/// main-ui が永続化 flush を終えたことの通知。プロセスを終了する。
#[tauri::command]
pub fn complete_shutdown(app: AppHandle) {
    app.exit(0);
}

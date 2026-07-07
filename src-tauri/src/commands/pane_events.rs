//! ペインフォーカスモデル用イベント command。呼び出し元 webview オブジェクトから
//! label を取得する（クライアント申告の label は信用しない）。ロジックは持たず、
//! main-ui への emit のみを行う（`commands/webview.rs` と同じ「リモコン」方針）。

use serde::Serialize;
use tauri::{Emitter, Webview};

/// `pane://pointer-down` イベントの payload。ドキュメント上の契約: `{ label }`。
#[derive(Debug, Clone, Serialize)]
struct PanePointerDownPayload {
    label: String,
}

/// `pane://wheel` イベントの payload。ドキュメント上の契約: `{ label, deltaX, deltaY }`。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PaneWheelPayload {
    label: String,
    delta_x: f64,
    delta_y: f64,
}

/// ペイン内で pointerdown を検知したことを main-ui に知らせる。フォーカス取得の起点。
#[tauri::command]
pub fn notify_pane_pointer_down(webview: Webview) -> Result<(), String> {
    webview
        .emit_to(
            "main-ui",
            "pane://pointer-down",
            PanePointerDownPayload {
                label: webview.label().to_string(),
            },
        )
        .map_err(|e| e.to_string())
}

/// 未フォーカスペイン上の wheel を main-ui（app のストリップ横スクロール）へ中継する。
/// delta 0,0 は起動時の IPC 疎通 ping。
#[tauri::command]
pub fn forward_pane_wheel(webview: Webview, delta_x: f64, delta_y: f64) -> Result<(), String> {
    if delta_x == 0.0 && delta_y == 0.0 {
        println!(
            "[pane_events] IPC ping received from pane webview: {}",
            webview.label()
        );
    }

    webview
        .emit_to(
            "main-ui",
            "pane://wheel",
            PaneWheelPayload {
                label: webview.label().to_string(),
                delta_x,
                delta_y,
            },
        )
        .map_err(|e| e.to_string())
}

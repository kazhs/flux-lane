//! ペインフォーカスモデル用イベント command。呼び出し元 webview オブジェクトから
//! label を取得する（クライアント申告の label は信用しない）。ロジックは持たず、
//! main-ui への emit のみを行う（`commands/webview.rs` と同じ「リモコン」方針）。
//!
//! これら 2 command は capability `pane-remote` で任意 https オリジンに開放されている。
//! ペイン内の任意ページ JS が直接 invoke できる前提で、per-label のレートリミットを
//! かける（フォーカス奪取 DoS / wheel flood の緩和。完全な真正性検証は不可能）。

use serde::Serialize;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{Emitter, Webview};

/// pointerdown 通知の per-label 最小間隔。人間のクリック連打より十分短く、
/// スクリプトによる継続的なフォーカス奪取のループには効く値。
const POINTER_DOWN_MIN_INTERVAL: Duration = Duration::from_millis(150);
/// wheel 転送の per-label 最小間隔。トラックパッドの 120Hz（約 8ms 間隔）を通し、
/// tight loop での flood を落とす。
const WHEEL_MIN_INTERVAL: Duration = Duration::from_millis(4);

static LAST_POINTER_DOWN: Mutex<Option<HashMap<String, Instant>>> = Mutex::new(None);
static LAST_WHEEL: Mutex<Option<HashMap<String, Instant>>> = Mutex::new(None);

/// per-label のレートリミット判定。間隔内の呼び出しは false（黙って捨てる）。
fn pass_rate_limit(
    store: &Mutex<Option<HashMap<String, Instant>>>,
    label: &str,
    min_interval: Duration,
) -> bool {
    let mut guard = match store.lock() {
        Ok(guard) => guard,
        // poisoned でもイベントを全遮断するよりは通す方が害が少ない
        Err(poisoned) => poisoned.into_inner(),
    };
    let map = guard.get_or_insert_with(HashMap::new);
    let now = Instant::now();
    match map.get(label) {
        Some(last) if now.duration_since(*last) < min_interval => false,
        _ => {
            map.insert(label.to_string(), now);
            true
        }
    }
}

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
    let label = webview.label().to_string();
    if !pass_rate_limit(&LAST_POINTER_DOWN, &label, POINTER_DOWN_MIN_INTERVAL) {
        return Ok(());
    }

    webview
        .emit_to(
            "main-ui",
            "pane://pointer-down",
            PanePointerDownPayload { label },
        )
        .map_err(|e| e.to_string())
}

/// 未フォーカスペイン上の wheel を main-ui（app のストリップ横スクロール）へ中継する。
/// delta 0,0 は起動時の IPC 疎通 ping。
#[tauri::command]
pub fn forward_pane_wheel(webview: Webview, delta_x: f64, delta_y: f64) -> Result<(), String> {
    let label = webview.label().to_string();
    if delta_x == 0.0 && delta_y == 0.0 {
        println!("[pane_events] IPC ping received from pane webview: {label}");
    }
    if !pass_rate_limit(&LAST_WHEEL, &label, WHEEL_MIN_INTERVAL) {
        return Ok(());
    }

    webview
        .emit_to(
            "main-ui",
            "pane://wheel",
            PaneWheelPayload {
                label,
                delta_x,
                delta_y,
            },
        )
        .map_err(|e| e.to_string())
}

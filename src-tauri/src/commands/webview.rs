//! ペイン用ネイティブ webview の「リモコン」command 群。ロジックは持たず、
//! ライフサイクル判断・reconcile は TS 側 (`core/webview/WebviewManager.ts`) が担う。

use serde::{Deserialize, Serialize};
use std::sync::OnceLock;
use tauri::{
    AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, Position, Rect, Size,
    WebviewBuilder, WebviewUrl,
};

use crate::pane_focus::PANE_FOCUS_INIT_SCRIPT;
use crate::session::session_id_to_data_store_identifier;

/// logical px の矩形。`f64` は Tauri の Logical* 系と揃える。
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Bounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

/// `pane://page-load` イベントの payload。ドキュメント上の契約: `{ label, url, event }`。
#[derive(Debug, Clone, Serialize)]
struct PaneLoadEventPayload {
    label: String,
    url: String,
    event: &'static str,
}

/// 原点補正値（タイトルバー高）のキャッシュ。
///
/// macOS では子 webview の座標がタイトルバー込みの window frame 原点で解釈される一方、
/// main-ui の DOM ビューポートはタイトルバー分だけ短い。tauri の `Webview::size()` 等の
/// 読み値はこの差を反映しないため、TS 実測の `window.innerHeight` と `inner_size` の差を
/// y 補正に使う。差分の実体はタイトルバー高（不変）だが、Web Inspector をドックすると
/// viewport だけが縮んで「差分」が数百 px に化けるため、妥当な範囲（0〜60px）で観測できた
/// 最初の値を固定して以後使い回す。
static ORIGIN_OFFSET_Y: OnceLock<f64> = OnceLock::new();
const MAX_PLAUSIBLE_TITLEBAR_HEIGHT: f64 = 60.0;

fn bounds_to_rect(app: &AppHandle, bounds: Bounds, viewport_height: f64) -> Rect {
    let offset_y: f64 = *ORIGIN_OFFSET_Y.get_or_init(|| {
        (|| {
            let window = app.get_window("main")?;
            let scale = window.scale_factor().ok()?;
            let inner_h = window.inner_size().ok()?.to_logical::<f64>(scale).height;
            let diff = inner_h - viewport_height;
            // Inspector ドック中などの異常値はキャッシュせずに 0 扱い…にはできない
            // （OnceLock は初期化を一度しか許さない）ため、範囲外は 0 を確定させる。
            // 通常の起動シーケンスでは最初の setBounds は inspector より先に来る。
            (0.0..=MAX_PLAUSIBLE_TITLEBAR_HEIGHT)
                .contains(&diff)
                .then_some(diff)
        })()
        .unwrap_or(0.0)
    });

    Rect {
        position: Position::Logical(LogicalPosition::new(bounds.x, bounds.y + offset_y)),
        size: Size::Logical(LogicalSize::new(bounds.width, bounds.height)),
    }
}

fn get_pane_webview(app: &AppHandle, label: &str) -> Result<tauri::Webview, String> {
    app.get_webview(label)
        .ok_or_else(|| format!("webview not found: {label}"))
}

#[tauri::command]
pub fn create_pane_webview(
    app: AppHandle,
    label: String,
    url: String,
    session_id: String,
    bounds: Bounds,
    viewport_height: f64,
) -> Result<(), String> {
    if app.get_webview(&label).is_some() {
        return Err(format!("webview already exists: {label}"));
    }

    let parsed_url = tauri::Url::parse(&url).map_err(|e| format!("invalid url: {e}"))?;
    if parsed_url.scheme() != "http" && parsed_url.scheme() != "https" {
        return Err(format!(
            "unsupported url scheme (only http/https allowed): {}",
            parsed_url.scheme()
        ));
    }

    let data_store_identifier = session_id_to_data_store_identifier(&session_id)?;

    let window = app
        .get_window("main")
        .ok_or_else(|| "main window not found".to_string())?;

    let label_for_event = label.clone();
    let builder = WebviewBuilder::new(label.clone(), WebviewUrl::External(parsed_url))
        .data_store_identifier(data_store_identifier)
        .initialization_script(PANE_FOCUS_INIT_SCRIPT)
        .on_page_load(move |webview, payload| {
            let event = match payload.event() {
                tauri::webview::PageLoadEvent::Started => "started",
                tauri::webview::PageLoadEvent::Finished => "finished",
            };
            let _ = webview.emit_to(
                "main-ui",
                "pane://page-load",
                PaneLoadEventPayload {
                    label: label_for_event.clone(),
                    url: payload.url().to_string(),
                    event,
                },
            );
        });

    // 初期 bounds も main-ui 原点補正済みの座標で置く（直後の setBounds でも上書きされる）。
    let rect = bounds_to_rect(&app, bounds, viewport_height);
    let (position, size) = match (rect.position, rect.size) {
        (Position::Logical(p), Size::Logical(s)) => (p, s),
        _ => unreachable!("bounds_to_rect always returns logical position/size"),
    };
    window
        .add_child(builder, position, size)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn destroy_pane_webview(app: AppHandle, label: String, purge_data: bool) -> Result<(), String> {
    let webview = get_pane_webview(&app, &label)?;

    // clear_all_browsing_data は docs.rs/tauri で確認済みの API（WKWebsiteDataStore クリア相当）。
    if purge_data {
        webview
            .clear_all_browsing_data()
            .map_err(|e| format!("clear_all_browsing_data failed: {e}"))?;
    }

    webview.close().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_pane_bounds(
    app: AppHandle,
    label: String,
    bounds: Bounds,
    viewport_height: f64,
) -> Result<(), String> {
    let webview = get_pane_webview(&app, &label)?;
    webview
        .set_bounds(bounds_to_rect(&app, bounds, viewport_height))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_pane_visible(app: AppHandle, label: String, visible: bool) -> Result<(), String> {
    let webview = get_pane_webview(&app, &label)?;
    let result = if visible {
        webview.show()
    } else {
        webview.hide()
    };
    result.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn reload_pane(app: AppHandle, label: String) -> Result<(), String> {
    let webview = get_pane_webview(&app, &label)?;
    webview.reload().map_err(|e| e.to_string())
}

/// 指定した webview（ペイン or "main-ui"）にネイティブフォーカスを移す。
/// ペインフォーカスモデルで、フォーカス解除時に "main-ui" へキーボードフォーカスを戻すのに使う。
#[tauri::command]
pub fn focus_webview(app: AppHandle, label: String) -> Result<(), String> {
    let webview = get_pane_webview(&app, &label)?;
    webview.set_focus().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn eval_in_pane(app: AppHandle, label: String, js: String) -> Result<(), String> {
    let webview = get_pane_webview(&app, &label)?;
    webview.eval(js).map_err(|e| e.to_string())
}

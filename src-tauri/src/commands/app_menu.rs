//! アプリケーションメニューの「移動」サブメニュー（⌘1〜9 でペイン、⌃1〜9 で
//! ワークスペースにジャンプ）。DOM keydown はペイン WebView にキーボードフォーカスが
//! あると main-ui に届かないため、ネイティブメニューのアクセラレータで実装する
//! （`pane_menu.rs` 同様、ロジックは持たず main-ui への emit のみ行う「リモコン」方針）。

use serde::Serialize;
use tauri::{
    menu::{Menu, MenuItemBuilder, SubmenuBuilder},
    App, AppHandle, Emitter,
};

const GOTO_PANE_PREFIX: &str = "goto-pane::";
const GOTO_WORKSPACE_PREFIX: &str = "goto-workspace::";

/// `app://goto` イベントの payload。ドキュメント上の契約: `{ kind, index }`（index は 1-based）。
#[derive(Debug, Clone, Serialize)]
struct GotoPayload {
    kind: &'static str,
    index: u32,
}

/// `Menu::default` で標準メニュー（Edit の copy/paste 等）を維持したまま「移動」
/// サブメニューを追加し、app-wide メニューとして設定する。`lib.rs` の `setup` から一度だけ呼ぶ。
pub fn build_and_set_menu(app: &App) -> tauri::Result<()> {
    let pane_items: Vec<_> = (1..=9u32)
        .map(|i| {
            MenuItemBuilder::with_id(format!("{GOTO_PANE_PREFIX}{i}"), format!("ペイン {i}"))
                .accelerator(format!("CmdOrCtrl+{i}"))
                .build(app)
        })
        .collect::<tauri::Result<_>>()?;

    let workspace_items: Vec<_> = (1..=9u32)
        .map(|i| {
            MenuItemBuilder::with_id(
                format!("{GOTO_WORKSPACE_PREFIX}{i}"),
                format!("ワークスペース {i}"),
            )
            .accelerator(format!("Ctrl+{i}"))
            .build(app)
        })
        .collect::<tauri::Result<_>>()?;

    let mut navigate_menu_builder = SubmenuBuilder::new(app, "移動");
    for item in &pane_items {
        navigate_menu_builder = navigate_menu_builder.item(item);
    }
    navigate_menu_builder = navigate_menu_builder.separator();
    for item in &workspace_items {
        navigate_menu_builder = navigate_menu_builder.item(item);
    }
    let navigate_menu = navigate_menu_builder.build()?;

    let menu = Menu::default(app.handle())?;
    menu.append(&navigate_menu)?;
    app.set_menu(menu)?;

    Ok(())
}

/// `lib.rs` の `Window::on_menu_event` から呼ぶ。このメニュー由来でない event id は無視する
/// （他の `handle_menu_event` と同じ prefix チェック方式。混在しても安全）。
pub fn handle_menu_event(app: &AppHandle, event_id: &str) {
    let (kind, index_str) = if let Some(rest) = event_id.strip_prefix(GOTO_PANE_PREFIX) {
        ("pane", rest)
    } else if let Some(rest) = event_id.strip_prefix(GOTO_WORKSPACE_PREFIX) {
        ("workspace", rest)
    } else {
        return;
    };
    let Ok(index) = index_str.parse::<u32>() else {
        return;
    };

    let _ = app.emit_to("main-ui", "app://goto", GotoPayload { kind, index });
}

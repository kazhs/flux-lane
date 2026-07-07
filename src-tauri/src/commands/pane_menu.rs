//! レールアイテムのネイティブコンテキストメニュー。ロジックは持たず、メニュー項目 id に
//! pane label を埋め込んで往復させるだけ（`commands/webview.rs` と同じ「リモコン」方針）。
//! クリック時の action 解釈・確認ダイアログは TS 側 (`PaneRailContainer`) の責務。

use serde::Serialize;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    AppHandle, Emitter, Manager,
};

const DELETE_ITEM_PREFIX: &str = "pane-delete::";

/// `pane://menu-action` イベントの payload。ドキュメント上の契約: `{ label, action }`。
#[derive(Debug, Clone, Serialize)]
struct PaneMenuActionPayload {
    label: String,
    action: &'static str,
}

/// レールアイテムの右クリックで呼ばれる。カーソル位置にネイティブメニューを 1 項目
/// （「ペインを削除…」）だけ表示する。クリック結果は `on_menu_event`（`lib.rs` の setup 内で
/// 登録）が `pane://menu-action` として main-ui に emit する。
#[tauri::command]
pub fn popup_pane_menu(app: AppHandle, pane_label: String) -> Result<(), String> {
    let window = app
        .get_window("main")
        .ok_or_else(|| "main window not found".to_string())?;

    let delete_item =
        MenuItemBuilder::with_id(format!("{DELETE_ITEM_PREFIX}{pane_label}"), "ペインを削除…")
            .build(&app)
            .map_err(|e| e.to_string())?;

    let menu = MenuBuilder::new(&app)
        .item(&delete_item)
        .build()
        .map_err(|e| e.to_string())?;

    window.popup_menu(&menu).map_err(|e| e.to_string())
}

/// `lib.rs` の `Window::on_menu_event` から呼ぶ。このメニュー由来でない event id は無視する
/// （将来 macOS メニューバー等の event id と混在しても安全にする）。
pub fn handle_menu_event(app: &AppHandle, event_id: &str) {
    let Some(pane_label) = event_id.strip_prefix(DELETE_ITEM_PREFIX) else {
        return;
    };

    let _ = app.emit_to(
        "main-ui",
        "pane://menu-action",
        PaneMenuActionPayload {
            label: pane_label.to_string(),
            action: "delete",
        },
    );
}

//! WorkspaceTab のネイティブコンテキストメニュー。`pane_menu.rs` と同じ「リモコン」方針:
//! ロジックは持たず、メニュー項目 id に workspace id を埋め込んで往復させるだけ。
//! クリック時の action 解釈・確認ダイアログは TS 側 (`WorkspaceBarContainer`) の責務。

use serde::Serialize;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    AppHandle, Emitter, Manager,
};

const RENAME_ITEM_PREFIX: &str = "workspace-rename::";
const DELETE_ITEM_PREFIX: &str = "workspace-delete::";

/// `workspace://menu-action` イベントの payload。ドキュメント上の契約: `{ workspaceId, action }`。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceMenuActionPayload {
    workspace_id: String,
    action: &'static str,
}

/// WorkspaceTab の右クリックで呼ばれる。カーソル位置にネイティブメニューを 2 項目
/// （「名前を変更」「ワークスペースを削除…」）表示する。最後の 1 個の workspace の場合は
/// 削除項目を `is_last` で disabled にする（store 側の `removeWorkspace` も no-op ガード済みだが、
/// メニュー時点でも操作不能を明示する）。クリック結果は `on_menu_event`（`lib.rs` の
/// setup 内で登録）が `workspace://menu-action` として main-ui に emit する。
#[tauri::command]
pub fn popup_workspace_menu(
    app: AppHandle,
    workspace_id: String,
    is_last: bool,
) -> Result<(), String> {
    let window = app
        .get_window("main")
        .ok_or_else(|| "main window not found".to_string())?;

    let rename_item = MenuItemBuilder::with_id(
        format!("{RENAME_ITEM_PREFIX}{workspace_id}"),
        "名前を変更",
    )
    .build(&app)
    .map_err(|e| e.to_string())?;

    let delete_item = MenuItemBuilder::with_id(
        format!("{DELETE_ITEM_PREFIX}{workspace_id}"),
        "ワークスペースを削除…",
    )
    .enabled(!is_last)
    .build(&app)
    .map_err(|e| e.to_string())?;

    let menu = MenuBuilder::new(&app)
        .item(&rename_item)
        .item(&delete_item)
        .build()
        .map_err(|e| e.to_string())?;

    window.popup_menu(&menu).map_err(|e| e.to_string())
}

/// `lib.rs` の `Window::on_menu_event` から呼ぶ。このメニュー由来でない event id は無視する
/// （`pane_menu::handle_menu_event` と同じ prefix チェック方式。混在しても安全）。
pub fn handle_menu_event(app: &AppHandle, event_id: &str) {
    let (workspace_id, action) = if let Some(id) = event_id.strip_prefix(RENAME_ITEM_PREFIX) {
        (id, "rename")
    } else if let Some(id) = event_id.strip_prefix(DELETE_ITEM_PREFIX) {
        (id, "delete")
    } else {
        return;
    };

    let _ = app.emit_to(
        "main-ui",
        "workspace://menu-action",
        WorkspaceMenuActionPayload {
            workspace_id: workspace_id.to_string(),
            action,
        },
    );
}

//! レールアイテムのネイティブコンテキストメニュー。ロジックは持たず、メニュー項目 id に
//! pane label（と、移動先を選ぶ場合は workspace id）を埋め込んで往復させるだけ（
//! `commands/webview.rs` と同じ「リモコン」方針）。
//! クリック時の action 解釈・確認ダイアログは TS 側 (`PaneRailContainer`) の責務。

use serde::{Deserialize, Serialize};
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder},
    AppHandle, Emitter, Manager,
};

const DELETE_ITEM_PREFIX: &str = "pane-delete::";
const MOVE_ITEM_PREFIX: &str = "pane-move::";

/// `popup_pane_menu` の `workspaces` 引数の 1 要素。「ワークスペースへ移動」サブメニューの
/// 選択肢になる。TS 側は現在の全 workspace をこの形に詰めて渡す。
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceEntry {
    pub id: String,
    pub name: String,
    pub is_current: bool,
}

/// `pane://menu-action` イベントの payload。ドキュメント上の契約: `{ label, action, workspaceId? }`。
/// `workspaceId` は action が `"move"` のときのみ載る（delete 時は既存契約と同じキー無しの形を保つ）。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PaneMenuActionPayload {
    label: String,
    action: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    workspace_id: Option<String>,
}

/// レールアイテムの右クリックで呼ばれる。カーソル位置にネイティブメニューを表示する:
/// 「ワークスペースへ移動 ▸」サブメニュー（workspace ごとの項目。現在の所属先は disabled、
/// workspace が 1 個だけならサブメニュー自体を disabled）と「ペインを削除…」。
/// クリック結果は `on_menu_event`（`lib.rs` の setup 内で登録）が `pane://menu-action` として
/// main-ui に emit する。
#[tauri::command]
pub fn popup_pane_menu(
    app: AppHandle,
    pane_label: String,
    workspaces: Vec<WorkspaceEntry>,
) -> Result<(), String> {
    let window = app
        .get_window("main")
        .ok_or_else(|| "main window not found".to_string())?;

    let mut move_submenu_builder =
        SubmenuBuilder::new(&app, "ワークスペースへ移動").enabled(workspaces.len() > 1);
    for workspace in &workspaces {
        let move_item = MenuItemBuilder::with_id(
            format!("{MOVE_ITEM_PREFIX}{pane_label}::{}", workspace.id),
            workspace.name.clone(),
        )
        .enabled(!workspace.is_current)
        .build(&app)
        .map_err(|e| e.to_string())?;
        move_submenu_builder = move_submenu_builder.item(&move_item);
    }
    let move_submenu = move_submenu_builder.build().map_err(|e| e.to_string())?;

    let delete_item =
        MenuItemBuilder::with_id(format!("{DELETE_ITEM_PREFIX}{pane_label}"), "ペインを削除…")
            .build(&app)
            .map_err(|e| e.to_string())?;

    let menu = MenuBuilder::new(&app)
        .item(&move_submenu)
        .item(&delete_item)
        .build()
        .map_err(|e| e.to_string())?;

    window.popup_menu(&menu).map_err(|e| e.to_string())
}

/// `lib.rs` の `Window::on_menu_event` から呼ぶ。このメニュー由来でない event id は無視する
/// （将来 macOS メニューバー等の event id と混在しても安全にする）。
pub fn handle_menu_event(app: &AppHandle, event_id: &str) {
    if let Some(pane_label) = event_id.strip_prefix(DELETE_ITEM_PREFIX) {
        let _ = app.emit_to(
            "main-ui",
            "pane://menu-action",
            PaneMenuActionPayload {
                label: pane_label.to_string(),
                action: "delete",
                workspace_id: None,
            },
        );
        return;
    }

    if let Some(rest) = event_id.strip_prefix(MOVE_ITEM_PREFIX) {
        // pane_label 自体に `::` は含まれない前提（`labelForPane` の生成規則）なので、
        // 最初のセパレータで pane_label と workspace_id に 2 分割する。
        let Some((pane_label, workspace_id)) = rest.split_once("::") else {
            return;
        };
        let _ = app.emit_to(
            "main-ui",
            "pane://menu-action",
            PaneMenuActionPayload {
                label: pane_label.to_string(),
                action: "move",
                workspace_id: Some(workspace_id.to_string()),
            },
        );
    }
}

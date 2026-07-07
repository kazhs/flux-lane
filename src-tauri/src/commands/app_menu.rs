//! アプリケーションメニューの「移動」サブメニュー（⌘1〜9 でペイン、⌃1〜9 で
//! ワークスペースにジャンプ）と「ペイン」サブメニュー（⌘R で再読み込み、⌘W で閉じる）。
//! DOM keydown はペイン WebView にキーボードフォーカスがあると main-ui に届かないため、
//! ネイティブメニューのアクセラレータで実装する（`pane_menu.rs` 同様、ロジックは持たず
//! main-ui への emit のみ行う「リモコン」方針）。

use serde::Serialize;
use tauri::{
    menu::{Menu, MenuItemBuilder, SubmenuBuilder, WINDOW_SUBMENU_ID},
    App, AppHandle, Emitter,
};

const GOTO_PANE_PREFIX: &str = "goto-pane::";
const GOTO_WORKSPACE_PREFIX: &str = "goto-workspace::";
const PANE_ACTION_RELOAD_ID: &str = "pane-action::reload";
const PANE_ACTION_CLOSE_ID: &str = "pane-action::close";

/// `app://goto` イベントの payload。ドキュメント上の契約: `{ kind, index }`（index は 1-based）。
#[derive(Debug, Clone, Serialize)]
struct GotoPayload {
    kind: &'static str,
    index: u32,
}

/// `app://pane-action` イベントの payload。ドキュメント上の契約: `{ action }`。
#[derive(Debug, Clone, Serialize)]
struct PaneActionPayload {
    action: &'static str,
}

/// `Menu::default` で標準メニュー（Edit の copy/paste 等）を維持したまま「移動」「ペイン」
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

    let pane_reload_item = MenuItemBuilder::with_id(PANE_ACTION_RELOAD_ID, "ペインを再読み込み")
        .accelerator("CmdOrCtrl+R")
        .build(app)?;
    let pane_close_item = MenuItemBuilder::with_id(PANE_ACTION_CLOSE_ID, "ペインを閉じる")
        .accelerator("CmdOrCtrl+W")
        .build(app)?;
    let pane_menu = SubmenuBuilder::new(app, "ペイン")
        .item(&pane_reload_item)
        .item(&pane_close_item)
        .build()?;

    let menu = Menu::default(app.handle())?;
    remove_default_close_window_conflicts(&menu)?;
    menu.append(&navigate_menu)?;
    menu.append(&pane_menu)?;
    app.set_menu(menu)?;

    Ok(())
}

/// `Menu::default`（tauri 2.11.5 / muda 0.19.3）が組み込む標準メニューは、macOS では
/// File サブメニューと Window サブメニューの両方に「ウィンドウを閉じる」の predefined item
/// を持ち、いずれも ⌘W をアクセラレータに持つ（muda `PredefinedMenuItemType::CloseWindow`
/// のアクセラレータ定義: `CMD_OR_CTRL + KeyW`。⌘R はどの predefined item にも
/// 割り当てられていないため衝突しない）。「ペイン」サブメニューの ⌘W（ペインを閉じる）と
/// 衝突するため、標準側の該当項目を先に取り除く。
/// - File サブメニュー: macOS では Close Window のみを持つため丸ごと除去する（空メニューを
///   残さないため）。
/// - Window サブメニュー: Minimize/Maximize は残し、Close 項目だけを取り除く。
fn remove_default_close_window_conflicts<R: tauri::Runtime>(menu: &Menu<R>) -> tauri::Result<()> {
    if let Some(file_menu) = menu.items()?.into_iter().find(|item| {
        item.as_submenu()
            .is_some_and(|submenu| submenu.text().unwrap_or_default() == "File")
    }) {
        menu.remove(&file_menu)?;
    }

    if let Some(window_menu) = menu
        .get(WINDOW_SUBMENU_ID)
        .and_then(|item| item.as_submenu().cloned())
    {
        if let Some(close_item) = window_menu.items()?.into_iter().find(|item| {
            item.as_predefined_menuitem()
                .and_then(|predefined| predefined.text().ok())
                .is_some_and(|text| text.contains("Close"))
        }) {
            window_menu.remove(&close_item)?;
        }
    }

    Ok(())
}

/// `lib.rs` の `Window::on_menu_event` から呼ぶ。このメニュー由来でない event id は無視する
/// （他の `handle_menu_event` と同じ prefix チェック方式。混在しても安全）。
pub fn handle_menu_event(app: &AppHandle, event_id: &str) {
    if event_id == PANE_ACTION_RELOAD_ID {
        let _ = app.emit_to(
            "main-ui",
            "app://pane-action",
            PaneActionPayload { action: "reload" },
        );
        return;
    }
    if event_id == PANE_ACTION_CLOSE_ID {
        let _ = app.emit_to(
            "main-ui",
            "app://pane-action",
            PaneActionPayload { action: "close" },
        );
        return;
    }

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

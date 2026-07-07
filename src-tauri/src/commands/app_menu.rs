//! アプリケーションメニューの「移動」サブメニュー（ペイン/ワークスペースの絶対ジャンプ・
//! 相対移動）と「ペイン」サブメニュー（追加・再読み込み・トグル・閉じる）。
//! DOM keydown はペイン WebView にキーボードフォーカスがあると main-ui に届かないため、
//! ショートカットはネイティブメニューのアクセラレータで実装する（`pane_menu.rs` 同様、
//! ロジックは持たず main-ui への emit のみ行う「リモコン」方針）。
//!
//! アクセラレータ選定メモ:
//! - ワークスペース絶対ジャンプは `⌘⇧1〜9`。旧 `⌃1〜9` は macOS の Mission Control
//!   「デスクトップ切替」ショートカットに OS 側で横取りされて発火しなかったため変更した。
//! - ワークスペース相対移動は `⌃⇥`/`⌃⇧⇥`。Mission Control の `⌃→`/`⌃←` とは別キーで衝突しない。

use serde::Serialize;
use tauri::{
    menu::{Menu, MenuItemBuilder, SubmenuBuilder, WINDOW_SUBMENU_ID},
    App, AppHandle, Emitter,
};

const GOTO_PANE_PREFIX: &str = "goto-pane::";
const GOTO_WORKSPACE_PREFIX: &str = "goto-workspace::";

const NAVIGATE_PANE_PREV_ID: &str = "navigate::pane-prev";
const NAVIGATE_PANE_NEXT_ID: &str = "navigate::pane-next";
const NAVIGATE_WORKSPACE_PREV_ID: &str = "navigate::workspace-prev";
const NAVIGATE_WORKSPACE_NEXT_ID: &str = "navigate::workspace-next";

const PANE_ACTION_ADD_ID: &str = "pane-action::add";
const PANE_ACTION_RELOAD_ID: &str = "pane-action::reload";
const PANE_ACTION_TOGGLE_MUTE_ID: &str = "pane-action::toggle-mute";
const PANE_ACTION_TOGGLE_AUTOSCROLL_ID: &str = "pane-action::toggle-autoscroll";
const PANE_ACTION_CLOSE_ID: &str = "pane-action::close";

/// `app://goto` イベントの payload。ドキュメント上の契約: `{ kind, index }`（index は 1-based）。
#[derive(Debug, Clone, Serialize)]
struct GotoPayload {
    kind: &'static str,
    index: u32,
}

/// `app://navigate` イベントの payload。フォーカス/アクティブ対象の相対移動。
/// ドキュメント上の契約: `{ target, direction }`。
#[derive(Debug, Clone, Serialize)]
struct NavigatePayload {
    target: &'static str,
    direction: &'static str,
}

/// `app://pane-action` イベントの payload。ドキュメント上の契約: `{ action }`。
#[derive(Debug, Clone, Serialize)]
struct PaneActionPayload {
    action: &'static str,
}

/// `Menu::default` で標準メニュー（Edit の copy/paste 等）を維持したまま「移動」「ペイン」
/// サブメニューを追加し、app-wide メニューとして設定する。`lib.rs` の `setup` から一度だけ呼ぶ。
pub fn build_and_set_menu(app: &App) -> tauri::Result<()> {
    let navigate_menu = build_navigate_menu(app)?;
    let pane_menu = build_pane_menu(app)?;

    let menu = Menu::default(app.handle())?;
    remove_default_close_window_conflicts(&menu)?;
    menu.append(&navigate_menu)?;
    menu.append(&pane_menu)?;
    app.set_menu(menu)?;

    Ok(())
}

/// 「移動」サブメニュー: ペイン絶対ジャンプ（⌘1〜9）→ ペイン相対移動（⌘⌥←/→）→
/// ワークスペース絶対ジャンプ（⌘⇧1〜9）→ ワークスペース相対移動（⌃⇧⇥/⌃⇥）。
fn build_navigate_menu(app: &App) -> tauri::Result<tauri::menu::Submenu<tauri::Wry>> {
    let pane_items: Vec<_> = (1..=9u32)
        .map(|i| {
            MenuItemBuilder::with_id(format!("{GOTO_PANE_PREFIX}{i}"), format!("ペイン {i}"))
                .accelerator(format!("CmdOrCtrl+{i}"))
                .build(app)
        })
        .collect::<tauri::Result<_>>()?;

    let pane_prev = MenuItemBuilder::with_id(NAVIGATE_PANE_PREV_ID, "前のペイン")
        .accelerator("CmdOrCtrl+Alt+ArrowLeft")
        .build(app)?;
    let pane_next = MenuItemBuilder::with_id(NAVIGATE_PANE_NEXT_ID, "次のペイン")
        .accelerator("CmdOrCtrl+Alt+ArrowRight")
        .build(app)?;

    let workspace_items: Vec<_> = (1..=9u32)
        .map(|i| {
            MenuItemBuilder::with_id(
                format!("{GOTO_WORKSPACE_PREFIX}{i}"),
                format!("ワークスペース {i}"),
            )
            .accelerator(format!("CmdOrCtrl+Shift+{i}"))
            .build(app)
        })
        .collect::<tauri::Result<_>>()?;

    let workspace_prev = MenuItemBuilder::with_id(NAVIGATE_WORKSPACE_PREV_ID, "前のワークスペース")
        .accelerator("Ctrl+Shift+Tab")
        .build(app)?;
    let workspace_next = MenuItemBuilder::with_id(NAVIGATE_WORKSPACE_NEXT_ID, "次のワークスペース")
        .accelerator("Ctrl+Tab")
        .build(app)?;

    let mut builder = SubmenuBuilder::new(app, "移動");
    for item in &pane_items {
        builder = builder.item(item);
    }
    builder = builder.separator().item(&pane_prev).item(&pane_next);
    builder = builder.separator();
    for item in &workspace_items {
        builder = builder.item(item);
    }
    builder = builder
        .separator()
        .item(&workspace_prev)
        .item(&workspace_next);
    builder.build()
}

/// 「ペイン」サブメニュー: 追加（⌘T）・再読み込み（⌘R）・ミュート/オートスクロール切替
/// （⌘⇧M / ⌘⇧S）・閉じる（⌘W）。追加以外はフォーカス中ペインが対象（TS 側で解決）。
fn build_pane_menu(app: &App) -> tauri::Result<tauri::menu::Submenu<tauri::Wry>> {
    let add_item = MenuItemBuilder::with_id(PANE_ACTION_ADD_ID, "ペインを追加")
        .accelerator("CmdOrCtrl+T")
        .build(app)?;
    let reload_item = MenuItemBuilder::with_id(PANE_ACTION_RELOAD_ID, "ペインを再読み込み")
        .accelerator("CmdOrCtrl+R")
        .build(app)?;
    let mute_item = MenuItemBuilder::with_id(PANE_ACTION_TOGGLE_MUTE_ID, "ミュート切替")
        .accelerator("CmdOrCtrl+Shift+M")
        .build(app)?;
    let autoscroll_item =
        MenuItemBuilder::with_id(PANE_ACTION_TOGGLE_AUTOSCROLL_ID, "オートスクロール切替")
            .accelerator("CmdOrCtrl+Shift+S")
            .build(app)?;
    let close_item = MenuItemBuilder::with_id(PANE_ACTION_CLOSE_ID, "ペインを閉じる")
        .accelerator("CmdOrCtrl+W")
        .build(app)?;

    SubmenuBuilder::new(app, "ペイン")
        .item(&add_item)
        .item(&reload_item)
        .separator()
        .item(&mute_item)
        .item(&autoscroll_item)
        .separator()
        .item(&close_item)
        .build()
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
    if let Some(action) = pane_action_for(event_id) {
        let _ = app.emit_to("main-ui", "app://pane-action", PaneActionPayload { action });
        return;
    }

    if let Some(payload) = navigate_payload_for(event_id) {
        let _ = app.emit_to("main-ui", "app://navigate", payload);
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

fn pane_action_for(event_id: &str) -> Option<&'static str> {
    match event_id {
        PANE_ACTION_ADD_ID => Some("add"),
        PANE_ACTION_RELOAD_ID => Some("reload"),
        PANE_ACTION_TOGGLE_MUTE_ID => Some("toggle-mute"),
        PANE_ACTION_TOGGLE_AUTOSCROLL_ID => Some("toggle-autoscroll"),
        PANE_ACTION_CLOSE_ID => Some("close"),
        _ => None,
    }
}

fn navigate_payload_for(event_id: &str) -> Option<NavigatePayload> {
    match event_id {
        NAVIGATE_PANE_PREV_ID => Some(NavigatePayload {
            target: "pane",
            direction: "prev",
        }),
        NAVIGATE_PANE_NEXT_ID => Some(NavigatePayload {
            target: "pane",
            direction: "next",
        }),
        NAVIGATE_WORKSPACE_PREV_ID => Some(NavigatePayload {
            target: "workspace",
            direction: "prev",
        }),
        NAVIGATE_WORKSPACE_NEXT_ID => Some(NavigatePayload {
            target: "workspace",
            direction: "next",
        }),
        _ => None,
    }
}

mod commands;
mod pane_focus;
mod session;

use tauri::{LogicalPosition, LogicalSize, WebviewBuilder, WebviewUrl, WindowBuilder};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // wry (WKWebView) は window.confirm/alert を実装していないため、確認ダイアログは
        // dialog plugin のネイティブパネルを使う（wry #584）。
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let window = WindowBuilder::new(app, "main")
                .title("FluxLane")
                .inner_size(1280.0, 800.0)
                .min_inner_size(800.0, 600.0)
                .build()?;

            // Chrome Layer（React UI）。Pane Layer の webview はここに add_child で重ねる。
            window.add_child(
                WebviewBuilder::new("main-ui", WebviewUrl::App(Default::default())).auto_resize(),
                LogicalPosition::new(0.0, 0.0),
                LogicalSize::new(1280.0, 800.0),
            )?;

            // app-wide メニュー（標準メニュー + 「移動」サブメニュー、⌘1〜9 / ⌃1〜9）。
            // ペイン WebView にキーボードフォーカスがあると DOM keydown が main-ui に届かない
            // ため、ショートカットはネイティブメニューのアクセラレータ方式で実装する。
            commands::app_menu::build_and_set_menu(app)?;

            // レールのネイティブコンテキストメニュー（`popup_pane_menu` / `popup_workspace_menu`）
            // と app-wide メニューのクリック結果を main-ui へ中継する。tray icon 等、他のメニュー
            // 由来の event id は各 `handle_menu_event` 側で prefix チェックして無視する。
            let app_handle = app.handle().clone();
            window.on_menu_event(move |_window, event| {
                commands::pane_menu::handle_menu_event(&app_handle, event.id().as_ref());
                commands::workspace_menu::handle_menu_event(&app_handle, event.id().as_ref());
                commands::app_menu::handle_menu_event(&app_handle, event.id().as_ref());
            });

            // 二段階シャットダウン: close を一旦止めて main-ui に永続化 flush を依頼し、
            // `complete_shutdown` で実際に終了する（commands/shutdown.rs）。
            let close_handle = app.handle().clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    if commands::shutdown::should_defer_close(&close_handle) {
                        api.prevent_close();
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::webview::create_pane_webview,
            commands::webview::destroy_pane_webview,
            commands::webview::set_pane_bounds,
            commands::webview::set_pane_visible,
            commands::webview::reload_pane,
            commands::webview::eval_in_pane,
            commands::webview::focus_webview,
            commands::pane_menu::popup_pane_menu,
            commands::workspace_menu::popup_workspace_menu,
            commands::pane_events::notify_pane_pointer_down,
            commands::pane_events::forward_pane_wheel,
            commands::pane_events::report_pane_account,
            commands::storage::load_persisted_state,
            commands::storage::save_persisted_state,
            commands::storage::export_config_file,
            commands::storage::import_config_file,
            commands::shutdown::complete_shutdown,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

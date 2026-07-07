mod commands;
mod pane_focus;
mod session;

use tauri::{LogicalPosition, LogicalSize, WebviewBuilder, WebviewUrl, WindowBuilder};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let window = WindowBuilder::new(app, "main")
                .title("flux-lane")
                .inner_size(1280.0, 800.0)
                .min_inner_size(800.0, 600.0)
                .build()?;

            // Chrome Layer（React UI）。Pane Layer の webview はここに add_child で重ねる。
            window.add_child(
                WebviewBuilder::new("main-ui", WebviewUrl::App(Default::default())).auto_resize(),
                LogicalPosition::new(0.0, 0.0),
                LogicalSize::new(1280.0, 800.0),
            )?;

            // レールのネイティブコンテキストメニュー（`popup_pane_menu`）のクリック結果を
            // main-ui へ中継する。tray icon 等、他のメニュー由来の event id は
            // `handle_menu_event` 側で prefix チェックして無視する。
            let app_handle = app.handle().clone();
            window.on_menu_event(move |_window, event| {
                commands::pane_menu::handle_menu_event(&app_handle, event.id().as_ref());
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
            commands::pane_events::notify_pane_pointer_down,
            commands::pane_events::forward_pane_wheel,
            commands::storage::load_persisted_state,
            commands::storage::save_persisted_state,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

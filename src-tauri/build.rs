fn main() {
    // ペインフォーカスモデルの remote capability (pane-remote.json) で pane webview
    // (label: pane-*, remote https オリジン) から notify_pane_pointer_down /
    // forward_pane_wheel の 2 command だけを許可するには、app 側コマンドの ACL manifest
    // (permission: allow-<command>) が必要。ACL manifest を 1 つでも持たせると
    // 「app コマンドは capability で明示許可されていないと呼べない」という制約が
    // local origin (main-ui) にも及ぶため、既存の全 command も一緒に列挙し、
    // capabilities/default.json 側で main-ui に allow-<command> を付与している。
    tauri_build::try_build(
        tauri_build::Attributes::new().app_manifest(tauri_build::AppManifest::new().commands(&[
            "create_pane_webview",
            "destroy_pane_webview",
            "set_pane_bounds",
            "set_pane_visible",
            "reload_pane",
            "eval_in_pane",
            "focus_webview",
            "load_persisted_state",
            "save_persisted_state",
            "notify_pane_pointer_down",
            "forward_pane_wheel",
        ])),
    )
    .expect("failed to run tauri-build");
}

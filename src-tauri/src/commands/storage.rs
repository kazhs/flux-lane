//! `$APPDATA/config.json` の load/save。JSON の中身は TS 側が管理し、Rust は文字列として扱うだけ。

use std::fs;
use std::io::Write;
use std::path::PathBuf;

use tauri::{AppHandle, Manager};

const CONFIG_FILE_NAME: &str = "config.json";

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("failed to resolve app_data_dir: {e}"))?;
    Ok(dir.join(CONFIG_FILE_NAME))
}

#[tauri::command]
pub fn load_persisted_state(app: AppHandle) -> Result<Option<String>, String> {
    let path = config_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    fs::read_to_string(&path)
        .map(Some)
        .map_err(|e| format!("failed to read {}: {e}", path.display()))
}

#[tauri::command]
pub fn save_persisted_state(app: AppHandle, json: String) -> Result<(), String> {
    let path = config_path(&app)?;
    let dir = path
        .parent()
        .ok_or_else(|| "config path has no parent dir".to_string())?;
    fs::create_dir_all(dir).map_err(|e| format!("failed to create dir {}: {e}", dir.display()))?;

    // atomic write: 同ディレクトリに tmp を書いてから rename する（書き込み中のクラッシュで
    // config.json が破損しないように）。
    let tmp_path = path.with_extension("json.tmp");
    {
        let mut file = fs::File::create(&tmp_path)
            .map_err(|e| format!("failed to create {}: {e}", tmp_path.display()))?;
        file.write_all(json.as_bytes())
            .map_err(|e| format!("failed to write {}: {e}", tmp_path.display()))?;
        file.sync_all()
            .map_err(|e| format!("failed to sync {}: {e}", tmp_path.display()))?;
    }
    fs::rename(&tmp_path, &path).map_err(|e| {
        format!(
            "failed to rename {} -> {}: {e}",
            tmp_path.display(),
            path.display()
        )
    })
}

/// ユーザーが選んだ任意 path への構成エクスポート（バックアップ用）。`$APPDATA/config.json`
/// とは無関係で、親 dir が無ければ tmp ファイル作成の時点で自然に Err になる。
#[tauri::command]
pub fn export_config_file(path: String, json: String) -> Result<(), String> {
    let path = PathBuf::from(path);
    let tmp_path = path.with_extension("json.tmp");
    {
        let mut file = fs::File::create(&tmp_path)
            .map_err(|e| format!("failed to create {}: {e}", tmp_path.display()))?;
        file.write_all(json.as_bytes())
            .map_err(|e| format!("failed to write {}: {e}", tmp_path.display()))?;
        file.sync_all()
            .map_err(|e| format!("failed to sync {}: {e}", tmp_path.display()))?;
    }
    fs::rename(&tmp_path, &path).map_err(|e| {
        format!(
            "failed to rename {} -> {}: {e}",
            tmp_path.display(),
            path.display()
        )
    })
}

/// ユーザーが選んだ任意 path からの構成インポート（バックアップ用）。
#[tauri::command]
pub fn import_config_file(path: String) -> Result<String, String> {
    let path = PathBuf::from(path);
    fs::read_to_string(&path).map_err(|e| format!("failed to read {}: {e}", path.display()))
}

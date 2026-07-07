/**
 * ネイティブ確認ダイアログ。wry (WKWebView) は window.confirm を実装していないため
 * （常に falsy になる）、確認 UI は必ずこれを使う。Tauri API import はこのディレクトリのみ。
 */
import { confirm, open, save } from "@tauri-apps/plugin-dialog";

export function confirmDialog(message: string): Promise<boolean> {
  return confirm(message, { title: "FluxLane", kind: "warning" });
}

const JSON_DIALOG_FILTERS = [{ name: "JSON", extensions: ["json"] }];

/** 構成エクスポート用の保存先選択ダイアログ。キャンセル時は null。 */
export function saveFileDialog(
  defaultFileName: string,
): Promise<string | null> {
  return save({ defaultPath: defaultFileName, filters: JSON_DIALOG_FILTERS });
}

/** 構成インポート用のファイル選択ダイアログ。キャンセル時は null。 */
export function openFileDialog(): Promise<string | null> {
  return open({
    filters: JSON_DIALOG_FILTERS,
    multiple: false,
    directory: false,
  });
}

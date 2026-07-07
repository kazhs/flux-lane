/**
 * ネイティブ確認ダイアログ。wry (WKWebView) は window.confirm を実装していないため
 * （常に falsy になる）、確認 UI は必ずこれを使う。Tauri API import はこのディレクトリのみ。
 */
import { confirm } from "@tauri-apps/plugin-dialog";

export function confirmDialog(message: string): Promise<boolean> {
  return confirm(message, { title: "flux-lane", kind: "warning" });
}

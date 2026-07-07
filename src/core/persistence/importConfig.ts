import { useAppStore } from "../../stores/appStore";
import { importConfigFile } from "../ipc/commands";
import { openFileDialog } from "../ipc/dialog";
import { parsePersistedState } from "./parsePersistedState";

export type ImportConfigResult = "done" | "cancelled" | "invalid";

/**
 * JSON ファイルから構成をインポートし、store に反映する。呼び出し前の確認 UI
 * （置き換え確認）は呼び出し側の責務。反映後の WebView 再構築・永続化は既存の
 * reconcile / persister の subscribe が自動で発火する。
 */
export async function importConfig(): Promise<ImportConfigResult> {
  const path = await openFileDialog();
  if (path === null) return "cancelled";

  const json = await importConfigFile(path);
  const state = parsePersistedState(json);
  if (state === null) return "invalid";

  useAppStore.getState().hydrate(state);
  return "done";
}

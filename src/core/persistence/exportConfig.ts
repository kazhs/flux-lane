import { useAppStore } from "../../stores/appStore";
import { selectPersistedState } from "../../stores/selectors";
import { exportConfigFile } from "../ipc/commands";
import { saveFileDialog } from "../ipc/dialog";

function defaultConfigFileName(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `FluxLane-config-${yyyy}${mm}${dd}.json`;
}

/**
 * 構成（workspaces / panes / 設定）を JSON ファイルへエクスポートする。セッション
 * （Cookie/Storage）は {@link selectPersistedState} が扱わないため含まれない。
 * 保存先はネイティブダイアログで選ばせ、キャンセル時は `false` を返す。
 */
export async function exportConfig(): Promise<boolean> {
  const json = JSON.stringify(
    selectPersistedState(useAppStore.getState()),
    null,
    2,
  );

  const path = await saveFileDialog(defaultConfigFileName());
  if (path === null) return false;

  await exportConfigFile(path, json);
  return true;
}

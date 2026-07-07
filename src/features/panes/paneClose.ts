import { useAppStore } from "../../stores/appStore";
import { useUiStore } from "../../stores/uiStore";
import { confirmDialog } from "../../core/ipc/dialog";
import type { PaneId } from "../../types";

/**
 * ペインを閉じる共通フロー: 確認ダイアログ → OK なら removePane + removePaneRuntime。
 * ヘッダーの close ボタン（`PaneItem`）、レールのネイティブコンテキストメニュー
 * （`PaneRailContainer`）、⌘W（ネイティブメニューの `app://pane-action`、`bootstrap`）の
 * 3 経路から使う。paneId と title は呼び出し側で確認ダイアログ発火前に確定させること
 * （confirm 待ち中にフォーカスが変わっても対象がずれないようにするため）。
 */
export async function closePaneWithConfirm(
  paneId: PaneId,
  title: string,
): Promise<void> {
  const ok = await confirmDialog(
    `「${title}」を閉じる？セッションも削除される`,
  );
  if (!ok) return;
  useAppStore.getState().removePane(paneId);
  useUiStore.getState().removePaneRuntime(paneId);
}

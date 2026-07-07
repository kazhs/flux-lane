import { useAppStore } from "../../stores/appStore";
import { useUiStore } from "../../stores/uiStore";
import { selectActivePaneIds } from "../../stores/selectors";
import type { PaneId } from "../../types";

/** レール起点のジャンプ: strip 側の scroll イベントを LayoutController が拾って
 * WebView bounds を追随させる既存機構に乗せる（新規の同期経路は作らない）。 */
function scrollPaneIntoView(paneId: PaneId): void {
  const el = document.querySelector(`[data-pane-id="${paneId}"]`);
  el?.scrollIntoView({
    behavior: "smooth",
    inline: "nearest",
    block: "nearest",
  });
}

/**
 * 1-based index から paneIds 内の paneId を解決する。範囲外は null。DOM に触れない
 * 純粋関数として切り出し、`selectPaneByIndex` から使う（単体テスト可能にするため）。
 */
export function resolvePaneIdByIndex(
  paneIds: readonly PaneId[],
  index: number,
): PaneId | null {
  return paneIds[index - 1] ?? null;
}

/**
 * ペインを選択する: スクロールして表示 + フォーカスを移す。レールのクリック
 * （`PaneRailContainer`）とネイティブメニューのアクセラレータ（⌘1〜9、`app://goto`）の
 * 両方から使う共通処理。
 */
export function selectPane(paneId: PaneId): void {
  scrollPaneIntoView(paneId);
  useUiStore.getState().setFocusedPane(paneId);
}

/**
 * アクティブ workspace の 1-based index 番目のペインを選択する。範囲外の index は無視する
 * （`app://goto` の "pane" kind から呼ぶ）。
 */
export function selectPaneByIndex(index: number): void {
  const paneIds = selectActivePaneIds(useAppStore.getState());
  const paneId = resolvePaneIdByIndex(paneIds, index);
  if (!paneId) return;
  selectPane(paneId);
}

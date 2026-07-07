import { useAppStore } from "../../stores/appStore";
import { useUiStore } from "../../stores/uiStore";
import { selectActivePaneIds } from "../../stores/selectors";
import type { PaneId } from "../../types";

/** レール起点のジャンプ・フォーカス変化に伴う自動スクロール: strip 側の scroll イベントを
 * LayoutController が拾って WebView bounds を追随させる既存機構に乗せる
 * （新規の同期経路は作らない）。`PaneStripContainer` の focusedPaneId 監視からも使う。 */
export function scrollPaneIntoView(paneId: PaneId): void {
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

export type NavigateDirection = "prev" | "next";

/**
 * `current` の隣（prev = 左 / next = 右）の paneId を返す純粋関数。端はラップする（巡回）:
 * 右端で next すると先頭、左端で prev すると末尾へ回る。`current` が null（どのペインも
 * フォーカスなし）の場合は、prev なら末尾・next なら先頭を返す。ペインが無ければ null。
 * DOM に触れないので単体テスト可能。
 */
export function resolveAdjacentPaneId(
  paneIds: readonly PaneId[],
  current: PaneId | null,
  direction: NavigateDirection,
): PaneId | null {
  if (paneIds.length === 0) return null;
  if (current === null) {
    return direction === "next"
      ? (paneIds[0] ?? null)
      : (paneIds[paneIds.length - 1] ?? null);
  }
  const currentIndex = paneIds.indexOf(current);
  if (currentIndex === -1) return paneIds[0] ?? null;
  const delta = direction === "next" ? 1 : -1;
  const nextIndex = (currentIndex + delta + paneIds.length) % paneIds.length;
  return paneIds[nextIndex] ?? null;
}

/**
 * フォーカス中ペインの隣へフォーカスを移す（`app://navigate` の target "pane" から呼ぶ）。
 * 端はラップする（右端 next で先頭へ）。ペインが無ければ no-op。
 */
export function selectAdjacentPane(direction: NavigateDirection): void {
  const paneIds = selectActivePaneIds(useAppStore.getState());
  const current = useUiStore.getState().focusedPaneId;
  const paneId = resolveAdjacentPaneId(paneIds, current, direction);
  if (!paneId) return;
  selectPane(paneId);
}

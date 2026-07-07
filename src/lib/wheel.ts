/**
 * wheel の deltaX/deltaY を横スクロール量に変換する。縦方向が優位な wheel だけを横スクロール
 * として扱う（トラックパッドの意図的な横スクロールは素通しする）。横スクロールとして扱わない
 * 場合は null を返す。
 *
 * `PaneStrip` の DOM `onWheel`（ヘッダー・下端の帯など DOM が露出する領域）と、未フォーカス
 * ペインからネイティブ WebView 経由で転送される `pane://wheel`（`WebviewManager.onPaneWheel`
 * 経由で `PaneStripContainer` が使う）の両方で同じ変換規則を使うための共通関数。
 */
export function wheelToScrollDelta(
  deltaX: number,
  deltaY: number,
): number | null {
  if (Math.abs(deltaY) <= Math.abs(deltaX)) return null;
  return deltaY;
}

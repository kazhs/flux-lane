import type { PaneId, Rect } from "../../types";
import { RECT_EPSILON } from "./diffRects";

/**
 * placeholder rect を container（PaneStrip の横スクロール領域）の可視範囲にクランプする。
 *
 * - 左境界: レール（DOM）はネイティブ WebView より奥にあり部分クリップ API も無いため、
 *   境界をまたいだ分だけ WebView の bounds を削って重なりを防ぐ。削った間はページ左端が
 *   固定表示になる過渡アーティファクトが出るが、ペインは生きたまま残る（境界を 1px
 *   またいだだけで全体をカード化していた旧仕様は「WebView が壊れた」ように見えた）。
 * - 可視部分が無い場合は null = hidden（WebView を隠す）。
 * - 右境界: window が自然にクリップするのでクランプ不要。
 */
export function clampRectToContainer(
  containerRect: Rect | null,
  rect: Rect,
  epsilon: number = RECT_EPSILON,
): Rect | null {
  if (!containerRect) return rect;

  const containerLeft = containerRect.x;
  const containerRight = containerRect.x + containerRect.width;
  const right = rect.x + rect.width;

  if (rect.x >= containerRight - epsilon) return null; // 右に完全アウト
  if (right <= containerLeft + epsilon) return null; // 左に完全アウト
  if (rect.x < containerLeft - epsilon) {
    return { ...rect, x: containerLeft, width: right - containerLeft };
  }
  return rect;
}

/**
 * `previous` と `next` の hidden 集合を比較し、変化した paneId だけを
 * `paneId -> 新しい hidden 値` として返す純関数（`diffRects` と対の設計）。
 */
export function diffHiddenPaneIds(
  previous: ReadonlySet<PaneId>,
  next: ReadonlySet<PaneId>,
): Map<PaneId, boolean> {
  const changed = new Map<PaneId, boolean>();
  for (const paneId of next) {
    if (!previous.has(paneId)) changed.set(paneId, true);
  }
  for (const paneId of previous) {
    if (!next.has(paneId)) changed.set(paneId, false);
  }
  return changed;
}

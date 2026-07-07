import type { PaneId, Rect } from "../../types";
import { RECT_EPSILON } from "./diffRects";

/**
 * container（PaneStrip の横スクロール領域）の左境界をまたいだ、または右境界の外に完全に
 * 出た placeholder を「hidden」と判定する純関数。右境界からのはみ出しは window が自然に
 * クリップするので対象外（DOM が奥にあるネイティブ webview を覆えるのは左レールだけ）。
 */
export function computeHiddenPaneIds(
  containerRect: Rect | null,
  rects: ReadonlyMap<PaneId, Rect>,
  epsilon: number = RECT_EPSILON,
): Set<PaneId> {
  const hidden = new Set<PaneId>();
  if (!containerRect) return hidden;

  const containerLeft = containerRect.x;
  const containerRight = containerRect.x + containerRect.width;

  for (const [paneId, rect] of rects) {
    if (rect.x < containerLeft - epsilon || rect.x >= containerRight) {
      hidden.add(paneId);
    }
  }
  return hidden;
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

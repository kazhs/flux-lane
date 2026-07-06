import type { PaneId, Rect } from "../../types";

/** 差分判定の許容誤差（logical px）。 */
export const RECT_EPSILON = 0.5;

function rectsEqual(a: Rect, b: Rect, epsilon: number): boolean {
  return (
    Math.abs(a.x - b.x) <= epsilon &&
    Math.abs(a.y - b.y) <= epsilon &&
    Math.abs(a.width - b.width) <= epsilon &&
    Math.abs(a.height - b.height) <= epsilon
  );
}

/**
 * `previous` と `next` を比較し、新規追加または `epsilon` を超えて変化した rect だけを返す純関数。
 * `LayoutController` は毎フレームこれを呼び、変化分だけを `set_pane_bounds` IPC に渡す。
 */
export function diffRects(
  previous: ReadonlyMap<PaneId, Rect>,
  next: ReadonlyMap<PaneId, Rect>,
  epsilon: number = RECT_EPSILON,
): Map<PaneId, Rect> {
  const changed = new Map<PaneId, Rect>();
  for (const [paneId, rect] of next) {
    const prevRect = previous.get(paneId);
    if (!prevRect || !rectsEqual(prevRect, rect, epsilon)) {
      changed.set(paneId, rect);
    }
  }
  return changed;
}

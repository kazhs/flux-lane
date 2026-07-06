import type { PaneId } from "../../types";

/**
 * DragEndEvent の active/over から movePane に渡す挿入 index を求める純関数。
 * over が無い・自分自身への drop は no-op（null）として扱う。
 */
export function resolveMoveIndex(
  order: readonly PaneId[],
  activeId: PaneId,
  overId: PaneId | null,
): number | null {
  if (!overId || activeId === overId) return null;
  const index = order.indexOf(overId);
  return index === -1 ? null : index;
}

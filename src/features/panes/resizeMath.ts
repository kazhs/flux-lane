import { MIN_PANE_WIDTH } from "../../lib/constants";

/**
 * リサイズ開始時の幅 + ポインタ移動量(dx) から新しい幅を計算する純関数。
 * MIN_PANE_WIDTH 〜 maxWidth にクランプする（docs/ARCHITECTURE.md 1.3）。
 */
export function computeResizedWidth(
  startWidth: number,
  dx: number,
  maxWidth: number,
): number {
  const raw = startWidth + dx;
  return Math.min(
    Math.max(raw, MIN_PANE_WIDTH),
    Math.max(MIN_PANE_WIDTH, maxWidth),
  );
}

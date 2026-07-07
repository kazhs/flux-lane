import type { ReactNode, Ref, WheelEvent } from "react";
import { wheelToScrollDelta } from "../../lib/wheel";

export type PaneStripProps = {
  children: ReactNode;
  containerRef?: Ref<HTMLDivElement>;
};

/**
 * 縦ホイールを横スクロールに変換する（`wheelToScrollDelta` 参照）。ネイティブ WebView 上では
 * ホイールが DOM に届かないため、ヘッダー・下端の帯など DOM が露出する領域だけで確実に流せる
 * ようにする。
 */
function handleWheel(event: WheelEvent<HTMLDivElement>): void {
  const delta = wheelToScrollDelta(event.deltaX, event.deltaY);
  if (delta === null) return;
  event.currentTarget.scrollLeft += delta;
}

export function PaneStrip({ children, containerRef }: PaneStripProps) {
  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      className="pane-strip flex h-full overflow-x-auto"
    >
      {children}
    </div>
  );
}

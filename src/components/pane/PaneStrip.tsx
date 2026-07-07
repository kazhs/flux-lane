import type { ReactNode, Ref, WheelEvent } from "react";

export type PaneStripProps = {
  children: ReactNode;
  containerRef?: Ref<HTMLDivElement>;
};

/**
 * 縦ホイールを横スクロールに変換する。ネイティブ WebView 上ではホイールが DOM に
 * 届かないため、ヘッダー・下端の帯など DOM が露出する領域だけで確実に流せるようにする。
 */
function handleWheel(event: WheelEvent<HTMLDivElement>): void {
  if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
  event.currentTarget.scrollLeft += event.deltaY;
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

import { useCallback, useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { computeResizedWidth } from "./resizeMath";
import type { PaneId } from "../../types";

export type UseResizePaneOptions = {
  paneId: PaneId;
  /** ドラッグ開始時点の幅（開始時にキャプチャする）。 */
  width: number;
  onResize: (paneId: PaneId, width: number) => void;
  onStart: () => void;
  onEnd: () => void;
};

/**
 * PaneResizeHandle の onPointerDown 実装。setPointerCapture でハンドル要素に
 * ポインタを固定し、rAF throttle で setPaneWidth を呼ぶ（docs/ARCHITECTURE.md 1.2/1.3）。
 */
export function useResizePane({
  paneId,
  width,
  onResize,
  onStart,
  onEnd,
}: UseResizePaneOptions) {
  const startWidthRef = useRef(width);
  const startXRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const pendingDxRef = useRef(0);
  const cleanupRef = useRef<(() => void) | null>(null);

  // ドラッグ中にコンポーネントが unmount された場合（ペイン削除など）の後始末。
  useEffect(() => () => cleanupRef.current?.(), []);

  const applyPending = useCallback(() => {
    rafRef.current = null;
    const next = computeResizedWidth(
      startWidthRef.current,
      pendingDxRef.current,
      window.innerWidth,
    );
    onResize(paneId, next);
  }, [onResize, paneId]);

  const scheduleApply = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(applyPending);
  }, [applyPending]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const target = event.currentTarget;
      const pointerId = event.pointerId;

      target.setPointerCapture(pointerId);
      startWidthRef.current = width;
      startXRef.current = event.clientX;
      pendingDxRef.current = 0;
      onStart();

      function handleMove(moveEvent: PointerEvent) {
        pendingDxRef.current = moveEvent.clientX - startXRef.current;
        scheduleApply();
      }

      function handleUp() {
        cleanup();
        onEnd();
      }

      function cleanup() {
        target.releasePointerCapture(pointerId);
        target.removeEventListener("pointermove", handleMove);
        target.removeEventListener("pointerup", handleUp);
        target.removeEventListener("pointercancel", handleUp);
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        cleanupRef.current = null;
      }

      cleanupRef.current = cleanup;
      target.addEventListener("pointermove", handleMove);
      target.addEventListener("pointerup", handleUp);
      target.addEventListener("pointercancel", handleUp);
    },
    [width, onStart, onEnd, scheduleApply],
  );

  return handlePointerDown;
}

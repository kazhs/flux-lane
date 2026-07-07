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
 *
 * リサイズ中も WebView は表示のまま（ライブリサイズ）。幅は開始位置 + カーソル絶対座標の
 * 差分で計算するため、カーソルが WebView 上に出てイベントが途切れても状態は壊れず、
 * 次に届いたイベントで正しい幅に追いつく。速いドラッグでは WebView bounds の同期ラグ分の
 * カクつきが出るが許容（完全解決は透明キャプチャ WebView 案 = 将来カード）。
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
        // ライブリサイズ中はカーソルがネイティブ WebView 上に出て pointerup を
        // 取りこぼすことがある（イベントは WebView に喰われる）。ボタンが離れて
        // いるのに move が届いたらドラッグ終了として自己修復する。
        if (moveEvent.buttons === 0) {
          handleUp();
          return;
        }
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

export interface SmoothScroller {
  /** 目標位置に delta を加算し、必要ならアニメーションを開始する。 */
  addDelta(delta: number): void;
  /** アニメーションを止めて目標位置を破棄する。 */
  cancel(): void;
}

/**
 * scrollLeft を目標位置へ毎フレーム lerp で近づける慣性スクローラ。
 * IPC 転送などでクランプされた wheel 入力でも出力が連続的になり、
 * ネイティブスクロールに近い体感になる。ネイティブに直接伝搬させる
 * 手段は無いため（docs/ARCHITECTURE.md 1.2）、これが現実的な上限。
 */
export function createSmoothScroller(
  getElement: () => HTMLElement | null,
  smoothing = 0.35,
): SmoothScroller {
  let target: number | null = null;
  let rafId: number | null = null;

  const step = (): void => {
    rafId = null;
    const el = getElement();
    if (el === null || target === null) {
      target = null;
      return;
    }
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    target = Math.min(Math.max(target, 0), max);
    const diff = target - el.scrollLeft;
    if (Math.abs(diff) < 0.5) {
      el.scrollLeft = target;
      target = null;
      return;
    }
    el.scrollLeft += diff * smoothing;
    rafId = requestAnimationFrame(step);
  };

  return {
    addDelta(delta: number): void {
      const el = getElement();
      if (el === null || delta === 0) return;
      target = (target ?? el.scrollLeft) + delta;
      if (rafId === null) rafId = requestAnimationFrame(step);
    },
    cancel(): void {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      target = null;
    },
  };
}

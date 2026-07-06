import type { PaneId, Rect } from "../../types";
import { diffRects } from "./diffRects";

export type RectMap = Map<PaneId, Rect>;

/**
 * placeholder（React が描画する空き枠）の画面座標を測り、ネイティブ webview の bounds に
 * 反映すべき差分だけを rAF throttle で通知する。DOM API 依存のため単体テスト対象外
 * （純関数部分は `diffRects` に分離済み）。
 */
export class LayoutController {
  private container: HTMLElement | null = null;
  private readonly placeholders = new Map<PaneId, HTMLElement>();
  private lastRects: RectMap = new Map();
  private resizeObserver: ResizeObserver | null = null;
  private rafHandle: number | null = null;
  private onRects: ((rects: RectMap) => void) | null = null;
  private running = false;

  private readonly scheduleMeasure = (): void => {
    if (!this.running || this.rafHandle !== null) return;
    this.rafHandle = requestAnimationFrame(() => {
      this.rafHandle = null;
      this.measure();
    });
  };

  registerContainer(el: HTMLElement | null): void {
    this.container = el;
  }

  registerPlaceholder(paneId: PaneId, el: HTMLElement | null): void {
    if (el) {
      this.placeholders.set(paneId, el);
    } else {
      this.placeholders.delete(paneId);
      this.lastRects.delete(paneId);
    }
    this.scheduleMeasure();
  }

  start(onRects: (rects: RectMap) => void): void {
    if (this.running) return;
    this.running = true;
    this.onRects = onRects;

    this.resizeObserver = new ResizeObserver(this.scheduleMeasure);
    if (this.container) this.resizeObserver.observe(this.container);
    for (const el of this.placeholders.values()) {
      this.resizeObserver.observe(el);
    }

    window.addEventListener("resize", this.scheduleMeasure, { passive: true });
    this.container?.addEventListener("scroll", this.scheduleMeasure, {
      passive: true,
    });

    this.scheduleMeasure();
  }

  stop(): void {
    this.running = false;
    this.onRects = null;

    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    window.removeEventListener("resize", this.scheduleMeasure);
    this.container?.removeEventListener("scroll", this.scheduleMeasure);
  }

  private measure(): void {
    const next: RectMap = new Map();
    for (const [paneId, el] of this.placeholders) {
      const domRect = el.getBoundingClientRect();
      next.set(paneId, {
        x: domRect.x,
        y: domRect.y,
        width: domRect.width,
        height: domRect.height,
      });
    }

    const changed = diffRects(this.lastRects, next);
    this.lastRects = next;

    if (changed.size > 0) {
      this.onRects?.(changed);
    }
  }
}

/** アプリ全体で 1 つの LayoutController を共有する singleton（`WebviewManager` と同じ運用）。 */
export const layoutController = new LayoutController();

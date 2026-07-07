import type { PaneId, Rect } from "../../types";
import { diffRects } from "./diffRects";
import { computeHiddenPaneIds, diffHiddenPaneIds } from "./paneVisibility";

export type RectMap = Map<PaneId, Rect>;
/** paneId -> 新しい hidden 値（true = 左境界をまたいで隠す、false = 復帰）。変化分のみ。 */
export type HiddenChangeMap = Map<PaneId, boolean>;
export type LayoutChangeCallback = (
  rects: RectMap,
  hiddenChanges: HiddenChangeMap,
) => void;

/**
 * placeholder（React が描画する空き枠）の画面座標を測り、ネイティブ webview の bounds に
 * 反映すべき差分と、常設レール（左境界）をまたいで隠すべき pane の変化を rAF throttle で
 * 通知する。DOM API 依存のため単体テスト対象外（純関数部分は `diffRects` /
 * `paneVisibility` に分離済み）。
 */
export class LayoutController {
  private container: HTMLElement | null = null;
  private readonly placeholders = new Map<PaneId, HTMLElement>();
  private lastRects: RectMap = new Map();
  private lastHidden: Set<PaneId> = new Set();
  private resizeObserver: ResizeObserver | null = null;
  private rafHandle: number | null = null;
  private onChange: LayoutChangeCallback | null = null;
  private running = false;
  /** 現在 scroll listener を付けている要素。差し替え・stop() で正しく外すために保持する。 */
  private scrollListenerTarget: HTMLElement | null = null;

  private readonly scheduleMeasure = (): void => {
    if (!this.running || this.rafHandle !== null) return;
    this.rafHandle = requestAnimationFrame(() => {
      this.rafHandle = null;
      this.measure();
    });
  };

  /**
   * running 中の差し替えに完全対応する（規約）。ビュー切替（add-pane / settings）で main
   * ビューが再マウントされると container は別の DOM 要素になるため、listener と observe を
   * 旧要素から外して新要素へ張り直す。これを怠ると再マウント後にスクロールしても再計測が
   * 走らず、WebView が DOM に追随しない（過去に実バグ化）。
   */
  registerContainer(el: HTMLElement | null): void {
    if (el === this.container) return;

    if (this.container) this.resizeObserver?.unobserve(this.container);
    if (this.scrollListenerTarget) {
      this.scrollListenerTarget.removeEventListener(
        "scroll",
        this.scheduleMeasure,
      );
      this.scrollListenerTarget = null;
    }

    this.container = el;

    if (el && this.running) {
      this.resizeObserver?.observe(el);
      el.addEventListener("scroll", this.scheduleMeasure, { passive: true });
      this.scrollListenerTarget = el;
    }
    this.scheduleMeasure();
  }

  registerPlaceholder(paneId: PaneId, el: HTMLElement | null): void {
    const previous = this.placeholders.get(paneId) ?? null;
    if (previous && previous !== el) {
      this.resizeObserver?.unobserve(previous);
    }

    if (el) {
      this.placeholders.set(paneId, el);
      // start() 後に登録された placeholder（後から追加されたペイン）も監視対象にする。
      // これが無いと幅変更時に ResizeObserver が発火せず、WebView の bounds が追随しない。
      if (el !== previous) this.resizeObserver?.observe(el);
    } else {
      this.placeholders.delete(paneId);
      this.lastRects.delete(paneId);
      // 削除済み paneId を hidden 集合に残すと、次の measure() で「消えたので unhidden」
      // という偽の通知（uiStore への幽霊 lifecycle 書き込み）が出てしまうため先に払う。
      this.lastHidden.delete(paneId);
    }
    this.scheduleMeasure();
  }

  start(onChange: LayoutChangeCallback): void {
    if (this.running) return;
    this.running = true;
    this.onChange = onChange;

    this.resizeObserver = new ResizeObserver(this.scheduleMeasure);
    if (this.container) this.resizeObserver.observe(this.container);
    for (const el of this.placeholders.values()) {
      this.resizeObserver.observe(el);
    }

    window.addEventListener("resize", this.scheduleMeasure, { passive: true });
    this.scrollListenerTarget = this.container;
    this.scrollListenerTarget?.addEventListener(
      "scroll",
      this.scheduleMeasure,
      {
        passive: true,
      },
    );

    this.scheduleMeasure();
  }

  stop(): void {
    this.running = false;
    this.onChange = null;

    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    window.removeEventListener("resize", this.scheduleMeasure);
    // start() 時に listener を付けた要素を外す。registerContainer で container が
    // 差し替わっていても、付けた側の参照を保持しているのでリークしない。
    this.scrollListenerTarget?.removeEventListener(
      "scroll",
      this.scheduleMeasure,
    );
    this.scrollListenerTarget = null;
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

    const changedRects = diffRects(this.lastRects, next);
    this.lastRects = next;

    const containerRect = this.container?.getBoundingClientRect() ?? null;
    const nextHidden = computeHiddenPaneIds(containerRect, next);
    const changedHidden = diffHiddenPaneIds(this.lastHidden, nextHidden);
    this.lastHidden = nextHidden;

    if (changedRects.size > 0 || changedHidden.size > 0) {
      this.onChange?.(changedRects, changedHidden);
    }
  }
}

/** アプリ全体で 1 つの LayoutController を共有する singleton（`WebviewManager` と同じ運用）。 */
export const layoutController = new LayoutController();

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSmoothScroller } from "../smoothScroll";

type Raf = () => void;
let rafQueue: Raf[] = [];
function flushRaf(times = 1): void {
  for (let i = 0; i < times; i++) {
    const queue = rafQueue;
    rafQueue = [];
    for (const fn of queue) fn();
  }
}

function createScrollable(scrollWidth: number, clientWidth: number) {
  return { scrollLeft: 0, scrollWidth, clientWidth } as HTMLElement;
}

beforeEach(() => {
  rafQueue = [];
  vi.stubGlobal("requestAnimationFrame", (fn: Raf) => {
    rafQueue.push(fn);
    return rafQueue.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createSmoothScroller", () => {
  it("目標位置へ毎フレーム漸近し、最終的に一致して止まる", () => {
    const el = createScrollable(2000, 800);
    const scroller = createSmoothScroller(() => el);

    scroller.addDelta(100);
    flushRaf(1);
    expect(el.scrollLeft).toBeGreaterThan(0);
    expect(el.scrollLeft).toBeLessThan(100);

    flushRaf(50);
    expect(el.scrollLeft).toBe(100);
    expect(rafQueue.length).toBe(0); // 収束後は停止している
  });

  it("アニメーション中の追加 delta は目標位置に累積する", () => {
    const el = createScrollable(2000, 800);
    const scroller = createSmoothScroller(() => el);

    scroller.addDelta(100);
    flushRaf(1);
    scroller.addDelta(100);
    flushRaf(50);
    expect(el.scrollLeft).toBe(200);
  });

  it("目標位置はスクロール可能範囲にクランプされる", () => {
    const el = createScrollable(1000, 800); // max = 200
    const scroller = createSmoothScroller(() => el);

    scroller.addDelta(10000);
    flushRaf(50);
    expect(el.scrollLeft).toBe(200);

    scroller.addDelta(-10000);
    flushRaf(50);
    expect(el.scrollLeft).toBe(0);
  });

  it("cancel で停止し、要素が無い場合は何もしない", () => {
    const el = createScrollable(2000, 800);
    const scroller = createSmoothScroller(() => el);
    scroller.addDelta(100);
    scroller.cancel();
    flushRaf(5);
    expect(el.scrollLeft).toBe(0);

    const detached = createSmoothScroller(() => null);
    detached.addDelta(100); // throw しない
    expect(rafQueue.length).toBe(0);
  });
});

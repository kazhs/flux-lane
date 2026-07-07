import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LayoutController } from "../LayoutController";
import type { Rect } from "../../../types";

/**
 * 規約テスト: registerContainer / registerPlaceholder は running 中の差し替えに完全対応する。
 * ビュー切替（add-pane / settings）による再マウントで container が別要素になっても、
 * scroll → 再計測 → 通知の経路が生き続けることを固定する（過去に実バグ化）。
 */

type Listener = () => void;

interface FakeElement {
  el: HTMLElement;
  dispatchScroll: () => void;
  setRect: (rect: Partial<Rect>) => void;
}

function createFakeElement(initial: Partial<Rect> = {}): FakeElement {
  let rect: Rect = { x: 0, y: 0, width: 100, height: 100, ...initial };
  const scrollListeners = new Set<Listener>();
  const el = {
    addEventListener: (type: string, fn: Listener) => {
      if (type === "scroll") scrollListeners.add(fn);
    },
    removeEventListener: (type: string, fn: Listener) => {
      if (type === "scroll") scrollListeners.delete(fn);
    },
    getBoundingClientRect: () => ({ ...rect }),
  } as unknown as HTMLElement;
  return {
    el,
    dispatchScroll: () => {
      for (const fn of [...scrollListeners]) fn();
    },
    setRect: (patch) => {
      rect = { ...rect, ...patch };
    },
  };
}

let rafQueue: Listener[] = [];
function flushRaf(): void {
  const queue = rafQueue;
  rafQueue = [];
  for (const fn of queue) fn();
}

beforeEach(() => {
  rafQueue = [];
  vi.stubGlobal("requestAnimationFrame", (fn: Listener) => {
    rafQueue.push(fn);
    return rafQueue.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("window", {
    addEventListener: () => {},
    removeEventListener: () => {},
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LayoutController.registerContainer", () => {
  it("running 中に container を差し替えても新要素の scroll で再計測が走る", () => {
    const controller = new LayoutController();
    const containerA = createFakeElement({ x: 44, width: 800 });
    const placeholder = createFakeElement({ x: 44, width: 400 });
    const onChange = vi.fn();

    controller.registerContainer(containerA.el);
    controller.registerPlaceholder("pane-1", placeholder.el);
    controller.start(onChange);
    flushRaf();
    expect(onChange).toHaveBeenCalledTimes(1); // 初回計測

    // ビュー切替による再マウントを模す: 新しい container 要素に差し替え
    const containerB = createFakeElement({ x: 44, width: 800 });
    controller.registerContainer(containerB.el);
    flushRaf(); // 差し替え時の再計測（rect 無変化なので通知なし）

    placeholder.setRect({ x: -156 }); // スクロールで placeholder が動いた
    containerB.dispatchScroll();
    flushRaf();
    expect(onChange).toHaveBeenCalledTimes(2);

    controller.stop();
  });

  it("差し替え後、旧 container の scroll では再計測しない", () => {
    const controller = new LayoutController();
    const containerA = createFakeElement();
    const placeholder = createFakeElement();
    const onChange = vi.fn();

    controller.registerContainer(containerA.el);
    controller.registerPlaceholder("pane-1", placeholder.el);
    controller.start(onChange);
    flushRaf();
    onChange.mockClear();

    controller.registerContainer(createFakeElement().el);
    flushRaf();
    onChange.mockClear();

    placeholder.setRect({ x: 999 });
    containerA.dispatchScroll(); // 旧要素からは外れているはず
    flushRaf();
    expect(onChange).not.toHaveBeenCalled();

    controller.stop();
  });

  it("start 前に登録された container でも start 後の scroll で再計測が走る", () => {
    const controller = new LayoutController();
    const container = createFakeElement();
    const placeholder = createFakeElement();
    const onChange = vi.fn();

    controller.registerContainer(container.el);
    controller.registerPlaceholder("pane-1", placeholder.el);
    controller.start(onChange);
    flushRaf();
    onChange.mockClear();

    placeholder.setRect({ x: -50 });
    container.dispatchScroll();
    flushRaf();
    expect(onChange).toHaveBeenCalledTimes(1);

    controller.stop();
  });
});

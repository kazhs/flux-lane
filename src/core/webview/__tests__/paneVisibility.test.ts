import { describe, expect, it } from "vitest";
import { clampRectToContainer, diffHiddenPaneIds } from "../paneVisibility";
import type { Rect } from "../../../types";

function rect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height };
}

describe("clampRectToContainer", () => {
  const container = rect(44, 0, 800, 600); // レール幅 44px 分だけ左に寄った container

  it("containerRect が null（未計測）なら rect をそのまま返す", () => {
    const r = rect(0, 0, 100, 100);
    expect(clampRectToContainer(null, r)).toEqual(r);
  });

  it("container 内に完全に収まる rect はそのまま返す", () => {
    const r = rect(100, 0, 400, 600);
    expect(clampRectToContainer(container, r)).toEqual(r);
  });

  it("左境界ちょうどの rect はそのまま返す", () => {
    const r = rect(44, 0, 400, 600);
    expect(clampRectToContainer(container, r)).toEqual(r);
  });

  it("左境界をまたいだ rect は可視部分にクランプする（hidden にしない）", () => {
    const clamped = clampRectToContainer(container, rect(-56, 0, 400, 600));
    expect(clamped).toEqual(rect(44, 0, 300, 600)); // 右端 344 は維持
  });

  it("1px だけまたいだ rect もクランプで生き残る（旧仕様では全体カード化していた）", () => {
    const clamped = clampRectToContainer(container, rect(42, 0, 400, 600));
    expect(clamped).toEqual(rect(44, 0, 398, 600));
  });

  it("左に完全に出た rect は null（hidden）", () => {
    expect(clampRectToContainer(container, rect(-500, 0, 400, 600))).toBeNull();
  });

  it("右に完全に出た rect は null（hidden）", () => {
    expect(clampRectToContainer(container, rect(844, 0, 400, 600))).toBeNull();
  });

  it("右境界の部分はみ出しはクランプしない（window が自然にクリップする）", () => {
    const r = rect(700, 0, 400, 600);
    expect(clampRectToContainer(container, r)).toEqual(r);
  });
});

describe("diffHiddenPaneIds", () => {
  it("新たに hidden になった paneId を true で返す", () => {
    const changed = diffHiddenPaneIds(new Set(), new Set(["p1"]));
    expect(changed).toEqual(new Map([["p1", true]]));
  });

  it("hidden から復帰した paneId を false で返す", () => {
    const changed = diffHiddenPaneIds(new Set(["p1"]), new Set());
    expect(changed).toEqual(new Map([["p1", false]]));
  });

  it("変化が無ければ空", () => {
    const changed = diffHiddenPaneIds(new Set(["p1"]), new Set(["p1"]));
    expect(changed.size).toBe(0);
  });

  it("追加と復帰が同時でも両方返す", () => {
    const changed = diffHiddenPaneIds(new Set(["p1"]), new Set(["p2"]));
    expect(changed).toEqual(
      new Map([
        ["p2", true],
        ["p1", false],
      ]),
    );
  });
});

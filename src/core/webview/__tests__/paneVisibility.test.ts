import { describe, expect, it } from "vitest";
import { computeHiddenPaneIds, diffHiddenPaneIds } from "../paneVisibility";
import type { Rect } from "../../../types";

function rect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height };
}

describe("computeHiddenPaneIds", () => {
  const container = rect(44, 0, 800, 600); // レール幅 44px 分だけ左に寄った container

  it("returns empty when containerRect is null (未計測)", () => {
    const rects = new Map([["p1", rect(0, 0, 100, 100)]]);
    expect(computeHiddenPaneIds(null, rects)).toEqual(new Set());
  });

  it("marks a pane hidden when it crosses the left boundary", () => {
    const rects = new Map([["p1", rect(0, 0, 100, 100)]]); // x=0 < containerLeft=44
    expect(computeHiddenPaneIds(container, rects)).toEqual(new Set(["p1"]));
  });

  it("keeps a pane visible when flush with the left boundary", () => {
    const rects = new Map([["p1", rect(44, 0, 100, 100)]]);
    expect(computeHiddenPaneIds(container, rects).size).toBe(0);
  });

  it("marks a pane hidden when fully past the right boundary", () => {
    const rects = new Map([["p1", rect(844, 0, 100, 100)]]); // x >= containerRight=844
    expect(computeHiddenPaneIds(container, rects)).toEqual(new Set(["p1"]));
  });

  it("keeps a pane visible when only partially overflowing the right edge", () => {
    const rects = new Map([["p1", rect(700, 0, 200, 100)]]); // x=700 < containerRight
    expect(computeHiddenPaneIds(container, rects).size).toBe(0);
  });

  it("respects epsilon at the left boundary", () => {
    const rects = new Map([["p1", rect(43.7, 0, 100, 100)]]);
    expect(computeHiddenPaneIds(container, rects, 0.5).size).toBe(0);
  });

  it("evaluates multiple panes independently", () => {
    const rects = new Map([
      ["visible", rect(100, 0, 100, 100)],
      ["hidden", rect(0, 0, 100, 100)],
    ]);
    expect(computeHiddenPaneIds(container, rects)).toEqual(new Set(["hidden"]));
  });
});

describe("diffHiddenPaneIds", () => {
  it("reports a pane newly hidden as true", () => {
    const changed = diffHiddenPaneIds(new Set(), new Set(["p1"]));
    expect(changed).toEqual(new Map([["p1", true]]));
  });

  it("reports a pane newly visible as false", () => {
    const changed = diffHiddenPaneIds(new Set(["p1"]), new Set());
    expect(changed).toEqual(new Map([["p1", false]]));
  });

  it("reports nothing when the hidden set is unchanged", () => {
    const changed = diffHiddenPaneIds(new Set(["p1"]), new Set(["p1"]));
    expect(changed.size).toBe(0);
  });

  it("handles multiple panes, reporting only the changed ones", () => {
    const changed = diffHiddenPaneIds(
      new Set(["p1", "p2"]),
      new Set(["p1", "p3"]),
    );
    expect(changed).toEqual(
      new Map([
        ["p3", true],
        ["p2", false],
      ]),
    );
  });
});

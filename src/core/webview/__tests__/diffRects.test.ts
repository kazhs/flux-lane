import { describe, expect, it } from "vitest";
import { diffRects } from "../diffRects";
import type { Rect } from "../../../types";

function rect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height };
}

describe("diffRects", () => {
  it("includes a pane that is new in next", () => {
    const next = new Map([["p1", rect(0, 0, 100, 100)]]);
    const changed = diffRects(new Map(), next);
    expect(changed).toEqual(next);
  });

  it("excludes a pane whose rect is unchanged", () => {
    const previous = new Map([["p1", rect(0, 0, 100, 100)]]);
    const next = new Map([["p1", rect(0, 0, 100, 100)]]);
    const changed = diffRects(previous, next);
    expect(changed.size).toBe(0);
  });

  it("includes a pane whose rect moved beyond epsilon", () => {
    const previous = new Map([["p1", rect(0, 0, 100, 100)]]);
    const next = new Map([["p1", rect(10, 0, 100, 100)]]);
    const changed = diffRects(previous, next);
    expect(changed.get("p1")).toEqual(rect(10, 0, 100, 100));
  });

  it("excludes a pane whose rect moved within epsilon", () => {
    const previous = new Map([["p1", rect(0, 0, 100, 100)]]);
    const next = new Map([["p1", rect(0.3, 0, 100, 100)]]);
    const changed = diffRects(previous, next, 0.5);
    expect(changed.size).toBe(0);
  });

  it("does not report panes removed in next (removal is not a bounds update)", () => {
    const previous = new Map([["p1", rect(0, 0, 100, 100)]]);
    const changed = diffRects(previous, new Map());
    expect(changed.size).toBe(0);
  });

  it("detects a width-only change", () => {
    const previous = new Map([["p1", rect(0, 0, 100, 100)]]);
    const next = new Map([["p1", rect(0, 0, 200, 100)]]);
    const changed = diffRects(previous, next);
    expect(changed.has("p1")).toBe(true);
  });

  it("handles multiple panes, reporting only the changed one", () => {
    const previous = new Map([
      ["p1", rect(0, 0, 100, 100)],
      ["p2", rect(0, 0, 200, 200)],
    ]);
    const next = new Map([
      ["p1", rect(0, 0, 100, 100)],
      ["p2", rect(50, 0, 200, 200)],
    ]);
    const changed = diffRects(previous, next);
    expect([...changed.keys()]).toEqual(["p2"]);
  });

  it("respects a custom epsilon", () => {
    const previous = new Map([["p1", rect(0, 0, 100, 100)]]);
    const next = new Map([["p1", rect(2, 0, 100, 100)]]);
    expect(diffRects(previous, next, 5).size).toBe(0);
    expect(diffRects(previous, next, 1).size).toBe(1);
  });
});

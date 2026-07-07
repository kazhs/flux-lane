import { describe, expect, it } from "vitest";
import { resolveAdjacentPaneId, resolvePaneIdByIndex } from "../paneNavigation";

describe("resolvePaneIdByIndex", () => {
  it("resolves the 1-based index to the corresponding paneId", () => {
    expect(resolvePaneIdByIndex(["p1", "p2", "p3"], 1)).toBe("p1");
    expect(resolvePaneIdByIndex(["p1", "p2", "p3"], 3)).toBe("p3");
  });

  it("returns null for an out-of-range index", () => {
    expect(resolvePaneIdByIndex(["p1", "p2"], 3)).toBeNull();
    expect(resolvePaneIdByIndex(["p1", "p2"], 0)).toBeNull();
    expect(resolvePaneIdByIndex([], 1)).toBeNull();
  });

  it("returns null for a negative index", () => {
    expect(resolvePaneIdByIndex(["p1", "p2"], -1)).toBeNull();
  });
});

describe("resolveAdjacentPaneId", () => {
  const ids = ["p1", "p2", "p3"];

  it("moves to the neighbor in the given direction", () => {
    expect(resolveAdjacentPaneId(ids, "p2", "prev")).toBe("p1");
    expect(resolveAdjacentPaneId(ids, "p2", "next")).toBe("p3");
  });

  it("wraps around at the edges", () => {
    expect(resolveAdjacentPaneId(ids, "p1", "prev")).toBe("p3");
    expect(resolveAdjacentPaneId(ids, "p3", "next")).toBe("p1");
  });

  it("falls back to first/last when nothing is focused", () => {
    expect(resolveAdjacentPaneId(ids, null, "next")).toBe("p1");
    expect(resolveAdjacentPaneId(ids, null, "prev")).toBe("p3");
  });

  it("returns the first pane when the current id is unknown", () => {
    expect(resolveAdjacentPaneId(ids, "gone", "next")).toBe("p1");
  });

  it("returns null when there are no panes", () => {
    expect(resolveAdjacentPaneId([], null, "next")).toBeNull();
    expect(resolveAdjacentPaneId([], "p1", "prev")).toBeNull();
  });
});

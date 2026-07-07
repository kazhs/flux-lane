import { describe, expect, it } from "vitest";
import { resolvePaneIdByIndex } from "../paneNavigation";

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

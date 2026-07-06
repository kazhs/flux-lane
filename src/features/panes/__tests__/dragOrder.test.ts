import { describe, expect, it } from "vitest";
import { resolveMoveIndex } from "../dragOrder";

describe("resolveMoveIndex", () => {
  it("returns the over item's index in the current order", () => {
    expect(resolveMoveIndex(["p1", "p2", "p3"], "p1", "p3")).toBe(2);
  });

  it("returns null when dropped onto itself", () => {
    expect(resolveMoveIndex(["p1", "p2", "p3"], "p1", "p1")).toBeNull();
  });

  it("returns null when there is no drop target", () => {
    expect(resolveMoveIndex(["p1", "p2", "p3"], "p1", null)).toBeNull();
  });

  it("returns null when the over id is not part of the order", () => {
    expect(resolveMoveIndex(["p1", "p2", "p3"], "p1", "unknown")).toBeNull();
  });
});

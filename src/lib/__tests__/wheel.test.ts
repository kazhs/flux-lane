import { describe, expect, it } from "vitest";
import { wheelToScrollDelta } from "../wheel";

describe("wheelToScrollDelta", () => {
  it("converts a vertical-dominant wheel into a scroll delta", () => {
    expect(wheelToScrollDelta(0, 10)).toBe(10);
    expect(wheelToScrollDelta(2, -20)).toBe(-20);
  });

  it("returns null when the horizontal component dominates or ties", () => {
    expect(wheelToScrollDelta(10, 0)).toBeNull();
    expect(wheelToScrollDelta(10, 5)).toBeNull();
    expect(wheelToScrollDelta(5, 5)).toBeNull();
  });

  it("returns null for a no-op wheel (both deltas zero, e.g. the IPC ping)", () => {
    expect(wheelToScrollDelta(0, 0)).toBeNull();
  });
});

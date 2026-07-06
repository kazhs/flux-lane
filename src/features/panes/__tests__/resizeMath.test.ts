import { describe, expect, it } from "vitest";
import { computeResizedWidth } from "../resizeMath";
import { MIN_PANE_WIDTH } from "../../../lib/constants";

describe("computeResizedWidth", () => {
  it("adds dx to the start width when within bounds", () => {
    expect(computeResizedWidth(500, 50, 2000)).toBe(550);
    expect(computeResizedWidth(500, -50, 2000)).toBe(450);
  });

  it("clamps to MIN_PANE_WIDTH when the result would go below it", () => {
    expect(computeResizedWidth(MIN_PANE_WIDTH, -100, 2000)).toBe(
      MIN_PANE_WIDTH,
    );
  });

  it("clamps to maxWidth when the result would exceed it", () => {
    expect(computeResizedWidth(900, 500, 1000)).toBe(1000);
  });

  it("prefers MIN_PANE_WIDTH over maxWidth when maxWidth is smaller than the minimum", () => {
    expect(computeResizedWidth(500, -1000, 100)).toBe(MIN_PANE_WIDTH);
  });
});

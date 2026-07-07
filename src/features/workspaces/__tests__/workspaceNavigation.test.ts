import { describe, expect, it } from "vitest";
import { resolveAdjacentWorkspaceId } from "../workspaceNavigation";

describe("resolveAdjacentWorkspaceId", () => {
  const order = ["w1", "w2", "w3"];

  it("moves to the neighbor in the given direction", () => {
    expect(resolveAdjacentWorkspaceId(order, "w2", "prev")).toBe("w1");
    expect(resolveAdjacentWorkspaceId(order, "w2", "next")).toBe("w3");
  });

  it("wraps around at the edges", () => {
    expect(resolveAdjacentWorkspaceId(order, "w3", "next")).toBe("w1");
    expect(resolveAdjacentWorkspaceId(order, "w1", "prev")).toBe("w3");
  });

  it("falls back to the first workspace when current is unknown or null", () => {
    expect(resolveAdjacentWorkspaceId(order, "gone", "next")).toBe("w1");
    expect(resolveAdjacentWorkspaceId(order, null, "prev")).toBe("w1");
  });

  it("returns null when there are no workspaces", () => {
    expect(resolveAdjacentWorkspaceId([], null, "next")).toBeNull();
  });
});

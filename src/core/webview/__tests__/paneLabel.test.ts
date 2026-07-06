import { describe, expect, it } from "vitest";
import { labelForPane, paneIdFromLabel } from "../paneLabel";

describe("labelForPane / paneIdFromLabel", () => {
  it("prefixes the paneId with 'pane-'", () => {
    expect(labelForPane("abc-123")).toBe("pane-abc-123");
  });

  it("round-trips through labelForPane and paneIdFromLabel", () => {
    const paneId = "550e8400-e29b-41d4-a716-446655440000";
    expect(paneIdFromLabel(labelForPane(paneId))).toBe(paneId);
  });

  it("returns null for a label without the pane- prefix", () => {
    expect(paneIdFromLabel("main-ui")).toBeNull();
  });

  it("returns null for an empty label", () => {
    expect(paneIdFromLabel("")).toBeNull();
  });
});

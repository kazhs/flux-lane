import { describe, expect, it } from "vitest";
import { paneRailTooltip } from "../paneRailTooltip";

describe("paneRailTooltip", () => {
  it("returns only the display name when there is no shortcut or account", () => {
    expect(paneRailTooltip("Discord", null, null)).toBe("Discord");
  });

  it("prefixes the shortcut when present", () => {
    expect(paneRailTooltip("Discord", null, "⌘2")).toBe("⌘2 Discord");
  });

  it("appends the account in parens when present", () => {
    expect(paneRailTooltip("X", "@kazhs", null)).toBe("X (@kazhs)");
  });

  it("combines shortcut prefix and account suffix", () => {
    expect(paneRailTooltip("X", "@kazhs", "⌘2")).toBe("⌘2 X (@kazhs)");
  });
});

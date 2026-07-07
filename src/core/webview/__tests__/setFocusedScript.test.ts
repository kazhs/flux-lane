import { describe, expect, it } from "vitest";
import { setFocusedScript } from "../WebviewManager";

describe("setFocusedScript", () => {
  it("builds a guarded eval call for focused = true", () => {
    expect(setFocusedScript(true)).toBe(
      "window.__fluxLaneSetFocused && window.__fluxLaneSetFocused(true);",
    );
  });

  it("builds a guarded eval call for focused = false", () => {
    expect(setFocusedScript(false)).toBe(
      "window.__fluxLaneSetFocused && window.__fluxLaneSetFocused(false);",
    );
  });
});

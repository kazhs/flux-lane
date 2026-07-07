import { describe, expect, it } from "vitest";
import { shortcutLabel } from "../shortcutLabel";

describe("shortcutLabel", () => {
  it("prefixes the symbol to the order for 1..9", () => {
    expect(shortcutLabel("⌘", 1)).toBe("⌘1");
    expect(shortcutLabel("⌘", 9)).toBe("⌘9");
    expect(shortcutLabel("⌃", 3)).toBe("⌃3");
  });

  it("returns null for orders outside 1..9", () => {
    expect(shortcutLabel("⌘", 0)).toBeNull();
    expect(shortcutLabel("⌘", 10)).toBeNull();
    expect(shortcutLabel("⌘", -1)).toBeNull();
  });
});

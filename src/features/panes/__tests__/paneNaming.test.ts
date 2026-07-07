import { describe, expect, it } from "vitest";
import { nextServiceTitle } from "../paneNaming";

describe("nextServiceTitle", () => {
  it("always returns the base name as-is", () => {
    expect(nextServiceTitle("X")).toBe("X");
  });

  it("does not append a number even when the base name is already used", () => {
    expect(nextServiceTitle("X")).toBe("X");
  });
});

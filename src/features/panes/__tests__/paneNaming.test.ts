import { describe, expect, it } from "vitest";
import { nextServiceTitle } from "../paneNaming";

describe("nextServiceTitle", () => {
  it("returns the base name as-is when there is no collision", () => {
    expect(nextServiceTitle([], "X")).toBe("X");
    expect(nextServiceTitle(["Discord"], "X")).toBe("X");
  });

  it("appends 2 when the base name is already used once", () => {
    expect(nextServiceTitle(["X"], "X")).toBe("X 2");
  });

  it("skips numbers already in use and picks the first free one", () => {
    expect(nextServiceTitle(["X", "X 2"], "X")).toBe("X 3");
    expect(nextServiceTitle(["X", "X 3"], "X")).toBe("X 2");
  });

  it("does not confuse unrelated titles that merely start with the base name", () => {
    expect(nextServiceTitle(["X (backup)"], "X")).toBe("X");
  });
});

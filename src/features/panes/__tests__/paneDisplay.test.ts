import { describe, expect, it } from "vitest";
import { resolvePaneDisplayName } from "../paneDisplay";
import type { ServiceDefinition } from "../../../core/services";

const SERVICES: ServiceDefinition[] = [
  { id: "x", name: "X", url: "https://x.com" },
];

describe("resolvePaneDisplayName", () => {
  it("returns the service name when the url matches a preset service", () => {
    expect(resolvePaneDisplayName("https://x.com/home", "X 2", SERVICES)).toBe(
      "X",
    );
  });

  it("matches subdomains of a preset service", () => {
    expect(
      resolvePaneDisplayName("https://mobile.x.com/home", "X 2", SERVICES),
    ).toBe("X");
  });

  it("falls back to the pane title when no preset service matches", () => {
    expect(
      resolvePaneDisplayName("https://discord.com/app", "Discord", SERVICES),
    ).toBe("Discord");
  });

  it("falls back to the pane title when the url is invalid", () => {
    expect(resolvePaneDisplayName("not-a-url", "My Pane", SERVICES)).toBe(
      "My Pane",
    );
  });
});

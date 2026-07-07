import { describe, expect, it } from "vitest";
import { matchServiceByUrl } from "../matchServiceByUrl";
import type { ServiceDefinition } from "../../core/services";

const SERVICES: ServiceDefinition[] = [
  { id: "x", name: "X", url: "https://x.com" },
];

describe("matchServiceByUrl", () => {
  it("matches an exact hostname", () => {
    expect(matchServiceByUrl("https://x.com/home", SERVICES)).toEqual(
      SERVICES[0],
    );
  });

  it("matches a subdomain of the preset hostname", () => {
    expect(matchServiceByUrl("https://mobile.x.com/home", SERVICES)).toEqual(
      SERVICES[0],
    );
  });

  it("returns null when no preset hostname matches", () => {
    expect(matchServiceByUrl("https://example.com", SERVICES)).toBeNull();
  });

  it("returns null for an invalid URL", () => {
    expect(matchServiceByUrl("not-a-url", SERVICES)).toBeNull();
  });

  it("does not match a hostname that merely contains the preset as a substring", () => {
    expect(matchServiceByUrl("https://notx.com", SERVICES)).toBeNull();
  });
});

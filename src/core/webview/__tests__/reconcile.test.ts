import { describe, expect, it } from "vitest";
import { computeWebviewOps } from "../reconcile";

describe("computeWebviewOps", () => {
  it("creates a webview for a desired pane not in current", () => {
    const result = computeWebviewOps(new Map(), [
      { paneId: "p1", url: "https://a.example", sessionId: "s1" },
    ]);
    expect(result.creates).toEqual([
      { paneId: "p1", url: "https://a.example", sessionId: "s1" },
    ]);
    expect(result.destroys).toEqual([]);
  });

  it("does nothing when current matches desired exactly", () => {
    const current = new Map([["p1", "s1"]]);
    const result = computeWebviewOps(current, [
      { paneId: "p1", url: "https://a.example", sessionId: "s1" },
    ]);
    expect(result.creates).toEqual([]);
    expect(result.destroys).toEqual([]);
  });

  it("destroys a webview whose pane is no longer desired", () => {
    const current = new Map([["p1", "s1"]]);
    const result = computeWebviewOps(current, []);
    expect(result.creates).toEqual([]);
    expect(result.destroys).toEqual(["p1"]);
  });

  it("destroys and recreates when sessionId changes for the same pane", () => {
    const current = new Map([["p1", "s1"]]);
    const result = computeWebviewOps(current, [
      { paneId: "p1", url: "https://a.example", sessionId: "s2" },
    ]);
    expect(result.destroys).toEqual(["p1"]);
    expect(result.creates).toEqual([
      { paneId: "p1", url: "https://a.example", sessionId: "s2" },
    ]);
  });

  it("handles a mix of create, keep, and destroy in one pass", () => {
    const current = new Map([
      ["keep", "s-keep"],
      ["gone", "s-gone"],
    ]);
    const result = computeWebviewOps(current, [
      { paneId: "keep", url: "https://keep.example", sessionId: "s-keep" },
      { paneId: "new", url: "https://new.example", sessionId: "s-new" },
    ]);
    expect(result.creates).toEqual([
      { paneId: "new", url: "https://new.example", sessionId: "s-new" },
    ]);
    expect(result.destroys).toEqual(["gone"]);
  });

  it("returns empty diffs for empty current and empty desired", () => {
    const result = computeWebviewOps(new Map(), []);
    expect(result.creates).toEqual([]);
    expect(result.destroys).toEqual([]);
  });

  it("creates multiple panes in the order given", () => {
    const result = computeWebviewOps(new Map(), [
      { paneId: "p1", url: "https://a.example", sessionId: "s1" },
      { paneId: "p2", url: "https://b.example", sessionId: "s2" },
    ]);
    expect(result.creates.map((c) => c.paneId)).toEqual(["p1", "p2"]);
  });

  it("destroys multiple panes no longer present in desired", () => {
    const current = new Map([
      ["p1", "s1"],
      ["p2", "s2"],
    ]);
    const result = computeWebviewOps(current, []);
    expect(result.destroys).toEqual(["p1", "p2"]);
  });
});

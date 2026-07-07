import { describe, expect, it } from "vitest";
import { computeDesiredPanes } from "../workspaceResidency";
import type { AppState } from "../../../stores/appStore";
import type { Pane } from "../../../types";
import {
  DEFAULT_PANE_WIDTH_RATIO,
  MIN_PANE_WIDTH,
} from "../../../lib/constants";

function makePane(id: string): Pane {
  return {
    id,
    title: id,
    url: `https://${id}.example`,
    sessionId: `s-${id}`,
    width: MIN_PANE_WIDTH,
    muted: false,
    autoScroll: false,
  };
}

function makeState(overrides: Partial<AppState>): AppState {
  return {
    workspaces: {},
    panes: {},
    workspaceOrder: [],
    activeWorkspaceId: null,
    settings: { defaultPaneWidthRatio: DEFAULT_PANE_WIDTH_RATIO },
    ...overrides,
  };
}

describe("computeDesiredPanes", () => {
  it("returns only the active workspace's panes when there is no previous workspace", () => {
    const p1 = makePane("p1");
    const state = makeState({
      workspaces: { a: { id: "a", name: "A", paneIds: ["p1"] } },
      panes: { p1 },
      activeWorkspaceId: "a",
    });

    const result = computeDesiredPanes(state, null);

    expect(result.panes).toEqual([p1]);
    expect(result.backgroundPaneIds.size).toBe(0);
  });

  it("returns only the active workspace's panes when previous === active", () => {
    const p1 = makePane("p1");
    const state = makeState({
      workspaces: { a: { id: "a", name: "A", paneIds: ["p1"] } },
      panes: { p1 },
      activeWorkspaceId: "a",
    });

    const result = computeDesiredPanes(state, "a");

    expect(result.panes).toEqual([p1]);
    expect(result.backgroundPaneIds.size).toBe(0);
  });

  it("unions active and previous workspace panes, marking previous-only panes as background", () => {
    const p1 = makePane("p1");
    const p2 = makePane("p2");
    const state = makeState({
      workspaces: {
        a: { id: "a", name: "A", paneIds: ["p1"] },
        b: { id: "b", name: "B", paneIds: ["p2"] },
      },
      panes: { p1, p2 },
      activeWorkspaceId: "a",
    });

    const result = computeDesiredPanes(state, "b");

    expect(result.panes).toEqual(expect.arrayContaining([p1, p2]));
    expect(result.panes.length).toBe(2);
    expect(result.backgroundPaneIds).toEqual(new Set(["p2"]));
  });

  it("does not double-count a pane that exists in both active and previous workspace", () => {
    const p1 = makePane("p1");
    const state = makeState({
      workspaces: {
        a: { id: "a", name: "A", paneIds: ["p1"] },
        b: { id: "b", name: "B", paneIds: ["p1"] },
      },
      panes: { p1 },
      activeWorkspaceId: "a",
    });

    const result = computeDesiredPanes(state, "b");

    expect(result.panes).toEqual([p1]);
    expect(result.backgroundPaneIds.size).toBe(0);
  });

  it("ignores a previous workspace that no longer exists (e.g. removed)", () => {
    const p1 = makePane("p1");
    const state = makeState({
      workspaces: { a: { id: "a", name: "A", paneIds: ["p1"] } },
      panes: { p1 },
      activeWorkspaceId: "a",
    });

    const result = computeDesiredPanes(state, "gone");

    expect(result.panes).toEqual([p1]);
    expect(result.backgroundPaneIds.size).toBe(0);
  });

  it("skips a previous-workspace paneId whose pane was already removed from state.panes", () => {
    const state = makeState({
      workspaces: {
        a: { id: "a", name: "A", paneIds: [] },
        b: { id: "b", name: "B", paneIds: ["gone"] },
      },
      panes: {},
      activeWorkspaceId: "a",
    });

    const result = computeDesiredPanes(state, "b");

    expect(result.panes).toEqual([]);
    expect(result.backgroundPaneIds.size).toBe(0);
  });
});

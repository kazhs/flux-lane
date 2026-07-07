import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore, type AppStore } from "../appStore";
import {
  selectActivePanes,
  selectActiveWorkspace,
  selectPersistedState,
} from "../selectors";
import { createDefaultPersistedState } from "../../lib/defaults";
import { MIN_PANE_WIDTH } from "../../lib/constants";
import type { WorkspaceId } from "../../types";

const INITIAL_STATE: AppStore = useAppStore.getState();

beforeEach(() => {
  useAppStore.setState(INITIAL_STATE, true);
});

function hydrateWithDefault() {
  const persisted = createDefaultPersistedState();
  useAppStore.getState().hydrate(persisted);
  return persisted;
}

function requireActiveWorkspaceId(): WorkspaceId {
  const id = useAppStore.getState().activeWorkspaceId;
  if (!id) throw new Error("expected active workspace to be set");
  return id;
}

describe("appStore", () => {
  it("removePane removes the pane from its workspace's paneIds", () => {
    hydrateWithDefault();
    const workspaceId = requireActiveWorkspaceId();
    const paneId = useAppStore.getState().addPane(workspaceId, {
      title: "X",
      url: "https://x.example",
      width: 400,
    });

    expect(useAppStore.getState().workspaces[workspaceId]?.paneIds).toEqual([
      paneId,
    ]);

    useAppStore.getState().removePane(paneId);

    expect(useAppStore.getState().panes[paneId]).toBeUndefined();
    expect(useAppStore.getState().workspaces[workspaceId]?.paneIds).toEqual([]);
  });

  it("removeWorkspace removes child panes and hands off the active workspace (prefers the previous neighbor)", () => {
    hydrateWithDefault();
    const wsA = requireActiveWorkspaceId();
    const wsB = useAppStore.getState().addWorkspace("B");
    const wsC = useAppStore.getState().addWorkspace("C");
    // order: [wsA, wsB, wsC], active = wsC
    const paneInC = useAppStore
      .getState()
      .addPane(wsC, { title: "P", url: "https://p.example", width: 400 });

    useAppStore.getState().removeWorkspace(wsC);

    const state = useAppStore.getState();
    expect(state.workspaces[wsC]).toBeUndefined();
    expect(state.panes[paneInC]).toBeUndefined();
    expect(state.activeWorkspaceId).toBe(wsB);
    expect(state.workspaceOrder).toEqual([wsA, wsB]);
  });

  it("removeWorkspace falls back to the next neighbor when the first workspace is removed", () => {
    hydrateWithDefault();
    const wsA = requireActiveWorkspaceId();
    const wsB = useAppStore.getState().addWorkspace("B");
    useAppStore.getState().setActiveWorkspace(wsA);

    useAppStore.getState().removeWorkspace(wsA);

    const state = useAppStore.getState();
    expect(state.workspaces[wsA]).toBeUndefined();
    expect(state.activeWorkspaceId).toBe(wsB);
    expect(state.workspaceOrder).toEqual([wsB]);
  });

  it("removeWorkspace is a no-op when only one workspace remains", () => {
    hydrateWithDefault();
    const wsA = requireActiveWorkspaceId();

    useAppStore.getState().removeWorkspace(wsA);

    const state = useAppStore.getState();
    expect(state.workspaces[wsA]).toBeDefined();
    expect(state.workspaceOrder).toEqual([wsA]);
    expect(state.activeWorkspaceId).toBe(wsA);
  });

  it("addPane initializes autoScroll to false", () => {
    hydrateWithDefault();
    const workspaceId = requireActiveWorkspaceId();

    const paneId = useAppStore.getState().addPane(workspaceId, {
      title: "X",
      url: "https://x.example",
      width: 400,
    });

    expect(useAppStore.getState().panes[paneId]?.autoScroll).toBe(false);
  });

  it("updatePane patches autoScroll", () => {
    hydrateWithDefault();
    const workspaceId = requireActiveWorkspaceId();
    const paneId = useAppStore.getState().addPane(workspaceId, {
      title: "X",
      url: "https://x.example",
      width: 400,
    });

    useAppStore.getState().updatePane(paneId, { autoScroll: true });

    expect(useAppStore.getState().panes[paneId]?.autoScroll).toBe(true);
  });

  it("clamps pane width to MIN_PANE_WIDTH on addPane and setPaneWidth", () => {
    hydrateWithDefault();
    const workspaceId = requireActiveWorkspaceId();

    const paneId = useAppStore.getState().addPane(workspaceId, {
      title: "X",
      url: "https://x.example",
      width: 10,
    });
    expect(useAppStore.getState().panes[paneId]?.width).toBe(MIN_PANE_WIDTH);

    useAppStore.getState().setPaneWidth(paneId, 1);
    expect(useAppStore.getState().panes[paneId]?.width).toBe(MIN_PANE_WIDTH);

    useAppStore.getState().setPaneWidth(paneId, 800);
    expect(useAppStore.getState().panes[paneId]?.width).toBe(800);
  });

  it("movePane reorders panes within their owning workspace", () => {
    hydrateWithDefault();
    const workspaceId = requireActiveWorkspaceId();
    const p1 = useAppStore.getState().addPane(workspaceId, {
      title: "1",
      url: "https://1.example",
      width: 400,
    });
    const p2 = useAppStore.getState().addPane(workspaceId, {
      title: "2",
      url: "https://2.example",
      width: 400,
    });
    const p3 = useAppStore.getState().addPane(workspaceId, {
      title: "3",
      url: "https://3.example",
      width: 400,
    });

    useAppStore.getState().movePane(p3, 0);

    expect(useAppStore.getState().workspaces[workspaceId]?.paneIds).toEqual([
      p3,
      p1,
      p2,
    ]);
  });

  it("hydrate + addWorkspace/addPane keeps selectPersistedState internally consistent", () => {
    const persisted = hydrateWithDefault();
    const workspaceId = useAppStore.getState().addWorkspace("New WS");
    const paneId = useAppStore.getState().addPane(workspaceId, {
      title: "N",
      url: "https://n.example",
      width: 400,
    });

    const result = selectPersistedState(useAppStore.getState());

    expect(result.schemaVersion).toBe(persisted.schemaVersion);
    expect(result.workspaces[workspaceId]?.paneIds).toEqual([paneId]);
    expect(result.panes[paneId]).toBeDefined();
    expect(result.workspaceOrder).toContain(workspaceId);
    expect(result.activeWorkspaceId).toBe(workspaceId);
  });

  it("selectPersistedState throws before hydration", () => {
    expect(() => selectPersistedState(useAppStore.getState())).toThrow();
  });

  it("assigns a distinct sessionId per addPane call", () => {
    hydrateWithDefault();
    const workspaceId = requireActiveWorkspaceId();
    const p1 = useAppStore.getState().addPane(workspaceId, {
      title: "1",
      url: "https://1.example",
      width: 400,
    });
    const p2 = useAppStore.getState().addPane(workspaceId, {
      title: "2",
      url: "https://2.example",
      width: 400,
    });

    const sessionId1 = useAppStore.getState().panes[p1]?.sessionId;
    const sessionId2 = useAppStore.getState().panes[p2]?.sessionId;

    expect(sessionId1).toBeDefined();
    expect(sessionId2).toBeDefined();
    expect(sessionId1).not.toBe(sessionId2);
  });

  it("selectActiveWorkspace / selectActivePanes reflect the active workspace's panes in order", () => {
    hydrateWithDefault();
    const workspaceId = requireActiveWorkspaceId();
    const p1 = useAppStore.getState().addPane(workspaceId, {
      title: "1",
      url: "https://1.example",
      width: 400,
    });
    const p2 = useAppStore.getState().addPane(workspaceId, {
      title: "2",
      url: "https://2.example",
      width: 400,
    });

    const workspace = selectActiveWorkspace(useAppStore.getState());
    expect(workspace?.id).toBe(workspaceId);

    const panes = selectActivePanes(useAppStore.getState());
    expect(panes.map((pane) => pane.id)).toEqual([p1, p2]);
  });
});

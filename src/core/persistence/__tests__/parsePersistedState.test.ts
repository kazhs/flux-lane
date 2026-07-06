import { describe, expect, it } from "vitest";
import { createDefaultPersistedState } from "../../../lib/defaults";
import { parsePersistedState } from "../parsePersistedState";

describe("parsePersistedState", () => {
  it("parses a valid persisted state", () => {
    const persisted = createDefaultPersistedState();
    expect(parsePersistedState(JSON.stringify(persisted))).toEqual(persisted);
  });

  it("returns null for invalid JSON", () => {
    expect(parsePersistedState("{not json")).toBeNull();
  });

  it("returns null for a non-object JSON value", () => {
    expect(parsePersistedState("42")).toBeNull();
    expect(parsePersistedState("null")).toBeNull();
    expect(parsePersistedState("[]")).toBeNull();
  });

  it("returns null for an unknown schemaVersion", () => {
    const persisted = createDefaultPersistedState();
    const raw = { ...persisted, schemaVersion: 2 };
    expect(parsePersistedState(JSON.stringify(raw))).toBeNull();
  });

  it("returns null when a required field is missing", () => {
    const persisted = createDefaultPersistedState();
    const rest: Record<string, unknown> = { ...persisted };
    delete rest.settings;
    expect(parsePersistedState(JSON.stringify(rest))).toBeNull();
  });

  it("returns null when a pane field has the wrong type", () => {
    const persisted = createDefaultPersistedState();
    const workspaceId = persisted.workspaceOrder[0];
    if (!workspaceId) throw new Error("expected a default workspace");
    const workspace = persisted.workspaces[workspaceId];
    if (!workspace) throw new Error("expected a default workspace entry");

    const paneId = "pane-1";
    const raw = {
      ...persisted,
      workspaces: {
        ...persisted.workspaces,
        [workspaceId]: { ...workspace, paneIds: [paneId] },
      },
      panes: {
        [paneId]: {
          id: paneId,
          title: "T",
          url: "https://x.example",
          sessionId: "s",
          width: "400", // 本来は number
          muted: false,
        },
      },
    };
    expect(parsePersistedState(JSON.stringify(raw))).toBeNull();
  });

  it("returns null when activeWorkspaceId does not reference an existing workspace", () => {
    const persisted = createDefaultPersistedState();
    const raw = { ...persisted, activeWorkspaceId: "missing-workspace" };
    expect(parsePersistedState(JSON.stringify(raw))).toBeNull();
  });

  it("returns null when workspaceOrder references a non-existent workspace", () => {
    const persisted = createDefaultPersistedState();
    const raw = {
      ...persisted,
      workspaceOrder: [...persisted.workspaceOrder, "missing-workspace"],
    };
    expect(parsePersistedState(JSON.stringify(raw))).toBeNull();
  });
});

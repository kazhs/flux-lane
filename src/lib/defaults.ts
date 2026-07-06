import { CURRENT_SCHEMA_VERSION } from "../types";
import type { PersistedState, WorkspaceId } from "../types";
import { DEFAULT_PANE_WIDTH_RATIO } from "./constants";

export function createDefaultPersistedState(): PersistedState {
  const workspaceId: WorkspaceId = crypto.randomUUID();

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    workspaces: {
      [workspaceId]: {
        id: workspaceId,
        name: "Default",
        paneIds: [],
      },
    },
    panes: {},
    workspaceOrder: [workspaceId],
    activeWorkspaceId: workspaceId,
    settings: {
      defaultPaneWidthRatio: DEFAULT_PANE_WIDTH_RATIO,
    },
  };
}

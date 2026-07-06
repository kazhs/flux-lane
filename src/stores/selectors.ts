import { CURRENT_SCHEMA_VERSION } from "../types";
import type { Pane, PersistedState, Workspace } from "../types";
import type { AppState } from "./appStore";

export function selectActiveWorkspace(state: AppState): Workspace | null {
  if (!state.activeWorkspaceId) return null;
  return state.workspaces[state.activeWorkspaceId] ?? null;
}

export function selectActivePanes(state: AppState): Pane[] {
  const workspace = selectActiveWorkspace(state);
  if (!workspace) return [];
  return workspace.paneIds
    .map((paneId) => state.panes[paneId])
    .filter((pane): pane is Pane => pane !== undefined);
}

export function selectPersistedState(state: AppState): PersistedState {
  if (!state.activeWorkspaceId) {
    throw new Error("selectPersistedState: store is not hydrated yet");
  }

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    workspaces: state.workspaces,
    panes: state.panes,
    workspaceOrder: state.workspaceOrder,
    activeWorkspaceId: state.activeWorkspaceId,
    settings: state.settings,
  };
}

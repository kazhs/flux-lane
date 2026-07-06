import { CURRENT_SCHEMA_VERSION } from "../types";
import type { Pane, PaneId, PersistedState, Workspace } from "../types";
import type { AppState } from "./appStore";

const EMPTY_PANE_IDS: PaneId[] = [];

export function selectActiveWorkspace(state: AppState): Workspace | null {
  if (!state.activeWorkspaceId) return null;
  return state.workspaces[state.activeWorkspaceId] ?? null;
}

/**
 * active workspace の paneIds。store 内の配列参照をそのまま返すため参照安定で、
 * React の useAppStore セレクタに直接使える。
 */
export function selectActivePaneIds(state: AppState): PaneId[] {
  return selectActiveWorkspace(state)?.paneIds ?? EMPTY_PANE_IDS;
}

/**
 * 呼び出しごとに新配列を生成するため参照が安定しない。React の useAppStore
 * セレクタに直接使うと無限再レンダーになる。getState()/subscribe 経由専用。
 */
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

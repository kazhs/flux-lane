import type { WorkspaceId, PaneId } from "./ids";
import type { Workspace } from "./workspace";
import type { Pane } from "./pane";
import type { AppSettings } from "./settings";

export const CURRENT_SCHEMA_VERSION = 1 as const;

export interface PersistedState {
  schemaVersion: 1;
  workspaces: Record<WorkspaceId, Workspace>;
  panes: Record<PaneId, Pane>;
  workspaceOrder: WorkspaceId[];
  activeWorkspaceId: WorkspaceId;
  settings: AppSettings;
}

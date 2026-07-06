import type { PaneId, WorkspaceId } from "./ids";

export interface Workspace {
  id: WorkspaceId;
  name: string;
  /** 並び順 */
  paneIds: PaneId[];
}

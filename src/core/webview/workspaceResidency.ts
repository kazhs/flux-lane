import type { AppState } from "../../stores/appStore";
import type { Pane, PaneId, WorkspaceId } from "../../types";

export interface DesiredPanesResult {
  /** アクティブ workspace のペイン ∪ 直前 workspace のペイン（重複なし）。 */
  panes: Pane[];
  /** `panes` のうち、直前 workspace 由来（アクティブ workspace には属さない）のペイン ID。
   * WebView は生かすが必ず hidden にする対象（LRU 2 枚常駐の background 側）。 */
  backgroundPaneIds: Set<PaneId>;
}

/**
 * reconcile の desired 集合を「アクティブ workspace のペイン ∪ 直前 workspace のペイン」に
 * 拡張する純関数（LRU 2 枚常駐）。`previousWorkspaceId` はアクティブ workspace 切替の直前値
 * （`WebviewManager` が appStore の変化を追跡して保持する。React 外・永続化しない）。
 *
 * - `previousWorkspaceId` が null、またはアクティブ workspace と同一なら background は空
 *   （通常の「アクティブ workspace のみ」に一致する）。
 * - アクティブ workspace 側に既に存在するペインは背景側で重複させない。
 */
export function computeDesiredPanes(
  state: AppState,
  previousWorkspaceId: WorkspaceId | null,
): DesiredPanesResult {
  const activeWorkspace = state.activeWorkspaceId
    ? state.workspaces[state.activeWorkspaceId]
    : null;
  const activePaneIds = new Set(activeWorkspace?.paneIds ?? []);

  const panes: Pane[] = [];
  for (const paneId of activePaneIds) {
    const pane = state.panes[paneId];
    if (pane) panes.push(pane);
  }

  const backgroundPaneIds = new Set<PaneId>();
  if (previousWorkspaceId && previousWorkspaceId !== state.activeWorkspaceId) {
    const previousWorkspace = state.workspaces[previousWorkspaceId];
    for (const paneId of previousWorkspace?.paneIds ?? []) {
      if (activePaneIds.has(paneId)) continue;
      const pane = state.panes[paneId];
      if (!pane) continue;
      panes.push(pane);
      backgroundPaneIds.add(paneId);
    }
  }

  return { panes, backgroundPaneIds };
}

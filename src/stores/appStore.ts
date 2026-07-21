import { create } from "zustand";
import type {
  AppSettings,
  Pane,
  PaneId,
  PersistedState,
  SessionId,
  Workspace,
  WorkspaceId,
} from "../types";
import { DEFAULT_PANE_WIDTH_RATIO, MIN_PANE_WIDTH } from "../lib/constants";

export interface AppState {
  workspaces: Record<WorkspaceId, Workspace>;
  panes: Record<PaneId, Pane>;
  workspaceOrder: WorkspaceId[];
  /** hydrate 前のみ null */
  activeWorkspaceId: WorkspaceId | null;
  settings: AppSettings;
}

export interface AppActions {
  hydrate: (state: PersistedState) => void;
  addWorkspace: (name: string) => WorkspaceId;
  renameWorkspace: (id: WorkspaceId, name: string) => void;
  removeWorkspace: (id: WorkspaceId) => void;
  setActiveWorkspace: (id: WorkspaceId) => void;
  moveWorkspace: (id: WorkspaceId, toIndex: number) => void;
  addPane: (
    workspaceId: WorkspaceId,
    input: { title: string; url: string; width: number },
  ) => PaneId;
  removePane: (paneId: PaneId) => void;
  updatePane: (
    paneId: PaneId,
    patch: Partial<
      Pick<Pane, "title" | "url" | "muted" | "autoScroll" | "autoScrollSpeed">
    >,
  ) => void;
  setPaneWidth: (paneId: PaneId, width: number) => void;
  movePane: (paneId: PaneId, toIndex: number) => void;
  movePaneToWorkspace: (paneId: PaneId, targetWorkspaceId: WorkspaceId) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
}

export type AppStore = AppState & AppActions;

function clampPaneWidth(width: number): number {
  return Math.max(MIN_PANE_WIDTH, width);
}

/** [0, length] にクランプした挿入位置。既存要素を除いた配列の長さに対して評価する。 */
function clampInsertIndex(index: number, length: number): number {
  return Math.min(Math.max(index, 0), length);
}

const initialState: AppState = {
  workspaces: {},
  panes: {},
  workspaceOrder: [],
  activeWorkspaceId: null,
  settings: {
    defaultPaneWidthRatio: DEFAULT_PANE_WIDTH_RATIO,
  },
};

export const useAppStore = create<AppStore>()((set, get) => ({
  ...initialState,

  hydrate: (state) =>
    set({
      workspaces: state.workspaces,
      panes: state.panes,
      workspaceOrder: state.workspaceOrder,
      activeWorkspaceId: state.activeWorkspaceId,
      settings: state.settings,
    }),

  addWorkspace: (name) => {
    const id: WorkspaceId = crypto.randomUUID();
    const workspace: Workspace = { id, name, paneIds: [] };
    set((s) => ({
      workspaces: { ...s.workspaces, [id]: workspace },
      workspaceOrder: [...s.workspaceOrder, id],
      activeWorkspaceId: id,
    }));
    return id;
  },

  renameWorkspace: (id, name) =>
    set((s) => {
      const workspace = s.workspaces[id];
      if (!workspace) return {};
      return { workspaces: { ...s.workspaces, [id]: { ...workspace, name } } };
    }),

  removeWorkspace: (id) =>
    set((s) => {
      // 最後の 1 個は削除不可
      if (s.workspaceOrder.length <= 1) return {};
      const workspace = s.workspaces[id];
      if (!workspace) return {};

      const workspaces = { ...s.workspaces };
      delete workspaces[id];

      const panes = { ...s.panes };
      for (const paneId of workspace.paneIds) {
        delete panes[paneId];
      }

      const removedIndex = s.workspaceOrder.indexOf(id);
      const workspaceOrder = s.workspaceOrder.filter((wid) => wid !== id);

      let activeWorkspaceId = s.activeWorkspaceId;
      if (activeWorkspaceId === id) {
        // 隣（前優先）。前が無ければ次（削除により同じ index に来る）。
        const fallbackIndex = Math.max(0, removedIndex - 1);
        activeWorkspaceId = workspaceOrder[fallbackIndex] ?? null;
      }

      return { workspaces, panes, workspaceOrder, activeWorkspaceId };
    }),

  setActiveWorkspace: (id) =>
    set((s) => {
      if (!s.workspaces[id]) return {};
      return { activeWorkspaceId: id };
    }),

  moveWorkspace: (id, toIndex) =>
    set((s) => {
      const currentIndex = s.workspaceOrder.indexOf(id);
      if (currentIndex === -1) return {};
      const workspaceOrder = [...s.workspaceOrder];
      workspaceOrder.splice(currentIndex, 1);
      workspaceOrder.splice(
        clampInsertIndex(toIndex, workspaceOrder.length),
        0,
        id,
      );
      return { workspaceOrder };
    }),

  addPane: (workspaceId, input) => {
    const workspace = get().workspaces[workspaceId];
    if (!workspace) {
      throw new Error(`addPane: workspace not found: ${workspaceId}`);
    }

    const id: PaneId = crypto.randomUUID();
    const sessionId: SessionId = crypto.randomUUID();
    const pane: Pane = {
      id,
      title: input.title,
      url: input.url,
      sessionId,
      width: clampPaneWidth(input.width),
      muted: false,
      autoScroll: false,
      autoScrollSpeed: 1,
    };

    set((s) => {
      const ws = s.workspaces[workspaceId];
      if (!ws) return {};
      return {
        panes: { ...s.panes, [id]: pane },
        workspaces: {
          ...s.workspaces,
          [workspaceId]: { ...ws, paneIds: [...ws.paneIds, id] },
        },
      };
    });

    return id;
  },

  removePane: (paneId) =>
    set((s) => {
      if (!s.panes[paneId]) return {};

      const panes = { ...s.panes };
      delete panes[paneId];

      let workspaces = s.workspaces;
      for (const [wid, ws] of Object.entries(s.workspaces)) {
        if (!ws.paneIds.includes(paneId)) continue;
        workspaces = {
          ...workspaces,
          [wid]: { ...ws, paneIds: ws.paneIds.filter((pid) => pid !== paneId) },
        };
      }

      return { panes, workspaces };
    }),

  updatePane: (paneId, patch) =>
    set((s) => {
      const pane = s.panes[paneId];
      if (!pane) return {};
      return { panes: { ...s.panes, [paneId]: { ...pane, ...patch } } };
    }),

  setPaneWidth: (paneId, width) =>
    set((s) => {
      const pane = s.panes[paneId];
      if (!pane) return {};
      return {
        panes: {
          ...s.panes,
          [paneId]: { ...pane, width: clampPaneWidth(width) },
        },
      };
    }),

  movePane: (paneId, toIndex) =>
    set((s) => {
      if (!s.panes[paneId]) return {};

      let workspaces = s.workspaces;
      for (const [wid, ws] of Object.entries(s.workspaces)) {
        const currentIndex = ws.paneIds.indexOf(paneId);
        if (currentIndex === -1) continue;

        const paneIds = [...ws.paneIds];
        paneIds.splice(currentIndex, 1);
        paneIds.splice(clampInsertIndex(toIndex, paneIds.length), 0, paneId);

        workspaces = { ...workspaces, [wid]: { ...ws, paneIds } };
        break;
      }

      return { workspaces };
    }),

  movePaneToWorkspace: (paneId, targetWorkspaceId) =>
    set((s) => {
      if (!s.panes[paneId]) return {};
      const target = s.workspaces[targetWorkspaceId];
      if (!target) return {};

      let sourceId: WorkspaceId | undefined;
      for (const [wid, ws] of Object.entries(s.workspaces)) {
        if (ws.paneIds.includes(paneId)) {
          sourceId = wid;
          break;
        }
      }
      if (sourceId === undefined || sourceId === targetWorkspaceId) return {};

      const source = s.workspaces[sourceId];
      if (!source) return {};

      return {
        workspaces: {
          ...s.workspaces,
          [sourceId]: {
            ...source,
            paneIds: source.paneIds.filter((pid) => pid !== paneId),
          },
          [targetWorkspaceId]: {
            ...target,
            paneIds: [...target.paneIds, paneId],
          },
        },
      };
    }),

  updateSettings: (patch) =>
    set((s) => ({ settings: { ...s.settings, ...patch } })),
}));

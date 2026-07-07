import { create } from "zustand";
import type { AppView, OverlayMode, PaneId, PaneRuntimeState } from "../types";

const DEFAULT_PANE_RUNTIME_STATE: PaneRuntimeState = {
  lifecycle: "suspended",
  currentUrl: null,
  isLoading: false,
  accountLabel: null,
};

export interface UiState {
  overlay: OverlayMode;
  view: AppView;
  paneRuntime: Record<PaneId, PaneRuntimeState>;
  /** ペインフォーカスモデル: フォーカス中のペイン。null は「どのペインもフォーカスしていない
   * （app chrome 側にフォーカスがある）」を表す（docs/ARCHITECTURE.md ペインフォーカスモデル）。 */
  focusedPaneId: PaneId | null;
}

export interface UiActions {
  setOverlay: (overlay: OverlayMode) => void;
  setView: (view: AppView) => void;
  setPaneLifecycle: (
    paneId: PaneId,
    lifecycle: PaneRuntimeState["lifecycle"],
  ) => void;
  setPaneLoading: (paneId: PaneId, isLoading: boolean) => void;
  setPaneCurrentUrl: (paneId: PaneId, url: string | null) => void;
  setPaneAccountLabel: (paneId: PaneId, label: string | null) => void;
  removePaneRuntime: (paneId: PaneId) => void;
  setFocusedPane: (paneId: PaneId | null) => void;
}

export type UiStore = UiState & UiActions;

function patchPaneRuntime(
  paneRuntime: Record<PaneId, PaneRuntimeState>,
  paneId: PaneId,
  patch: Partial<PaneRuntimeState>,
): Record<PaneId, PaneRuntimeState> {
  const current = paneRuntime[paneId] ?? DEFAULT_PANE_RUNTIME_STATE;
  return { ...paneRuntime, [paneId]: { ...current, ...patch } };
}

export const useUiStore = create<UiStore>()((set) => ({
  overlay: "none",
  view: "main",
  paneRuntime: {},
  focusedPaneId: null,

  setOverlay: (overlay) => set({ overlay }),

  setView: (view) => set({ view }),

  setPaneLifecycle: (paneId, lifecycle) =>
    set((s) => ({
      paneRuntime: patchPaneRuntime(s.paneRuntime, paneId, { lifecycle }),
    })),

  setPaneLoading: (paneId, isLoading) =>
    set((s) => ({
      paneRuntime: patchPaneRuntime(s.paneRuntime, paneId, { isLoading }),
    })),

  setPaneCurrentUrl: (paneId, url) =>
    set((s) => ({
      paneRuntime: patchPaneRuntime(s.paneRuntime, paneId, { currentUrl: url }),
    })),

  setPaneAccountLabel: (paneId, label) =>
    set((s) => ({
      paneRuntime: patchPaneRuntime(s.paneRuntime, paneId, {
        accountLabel: label,
      }),
    })),

  removePaneRuntime: (paneId) =>
    set((s) => {
      const paneRuntime = { ...s.paneRuntime };
      delete paneRuntime[paneId];
      return { paneRuntime };
    }),

  setFocusedPane: (paneId) => set({ focusedPaneId: paneId }),
}));

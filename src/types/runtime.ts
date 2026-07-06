export type PaneLifecycle = "active" | "hidden" | "suspended";

export type OverlayMode = "none" | "modal" | "dragging" | "resizing";

export type AppView = "main" | "settings" | "add-pane";

/** 永続化しないランタイム状態 */
export interface PaneRuntimeState {
  lifecycle: PaneLifecycle;
  currentUrl: string | null;
  isLoading: boolean;
}

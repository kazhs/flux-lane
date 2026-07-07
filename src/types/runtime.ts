export type PaneLifecycle = "active" | "hidden" | "suspended";

export type OverlayMode = "none" | "modal" | "dragging" | "resizing";

export type AppView = "main" | "settings";

/** 永続化しないランタイム状態 */
export interface PaneRuntimeState {
  lifecycle: PaneLifecycle;
  currentUrl: string | null;
  isLoading: boolean;
  /** サービスの `accountProbeScript` が検知したログイン中アカウントのハンドル（例: "@handle"）。
   * 未検知・非対応サービスは null。 */
  accountLabel: string | null;
}

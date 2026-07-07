import type { Rect } from "../../types";

/** Rust 側 `Bounds` struct（logical px）に対応。 */
export type Bounds = Rect;

/** `pane://page-load` イベントの payload。 */
export interface PaneLoadEventPayload {
  label: string;
  url: string;
  event: "started" | "finished";
}

/** `pane://pointer-down` イベントの payload。 */
export interface PanePointerDownEventPayload {
  label: string;
}

/** `pane://wheel` イベントの payload。 */
export interface PaneWheelEventPayload {
  label: string;
  deltaX: number;
  deltaY: number;
}

/** `pane://menu-action` イベントの payload。レールのネイティブコンテキストメニュー操作。 */
export interface PaneMenuActionEventPayload {
  label: string;
  action: "delete";
}

/** `workspace://menu-action` イベントの payload。WorkspaceTab のネイティブコンテキストメニュー操作。 */
export interface WorkspaceMenuActionEventPayload {
  workspaceId: string;
  action: "delete" | "rename";
}

/** `pane://account` イベントの payload。`accountProbeScript` が検知したアカウントラベル通知。 */
export interface PaneAccountEventPayload {
  label: string;
  handle: string;
}

/** `app://goto` イベントの payload。ネイティブメニューの「移動」サブメニュー（⌘1〜9 / ⌃1〜9）。
 * index は 1-based。 */
export interface AppGotoEventPayload {
  kind: "pane" | "workspace";
  index: number;
}

/** `app://pane-action` イベントの payload。ネイティブメニューの「ペイン」サブメニュー
 * （⌘R = 再読み込み, ⌘W = 閉じる）。フォーカス中ペインへの適用は TS 側の責務。 */
export interface AppPaneActionEventPayload {
  action: "reload" | "close";
}

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

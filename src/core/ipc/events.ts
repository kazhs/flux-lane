/**
 * Rust 側 event の型付き listen ラッパー。Tauri API を import するのはこのディレクトリのみ。
 */
import { listen } from "@tauri-apps/api/event";
import type { UnlistenFn } from "@tauri-apps/api/event";
import type {
  PaneLoadEventPayload,
  PaneMenuActionEventPayload,
  PanePointerDownEventPayload,
  PaneWheelEventPayload,
} from "./types";

export function onPanePageLoad(
  callback: (payload: PaneLoadEventPayload) => void,
): Promise<UnlistenFn> {
  return listen<PaneLoadEventPayload>("pane://page-load", (event) => {
    callback(event.payload);
  });
}

export function onPanePointerDown(
  callback: (payload: PanePointerDownEventPayload) => void,
): Promise<UnlistenFn> {
  return listen<PanePointerDownEventPayload>("pane://pointer-down", (event) => {
    callback(event.payload);
  });
}

export function onPaneWheel(
  callback: (payload: PaneWheelEventPayload) => void,
): Promise<UnlistenFn> {
  return listen<PaneWheelEventPayload>("pane://wheel", (event) => {
    callback(event.payload);
  });
}

export function onPaneMenuAction(
  callback: (payload: PaneMenuActionEventPayload) => void,
): Promise<UnlistenFn> {
  return listen<PaneMenuActionEventPayload>("pane://menu-action", (event) => {
    callback(event.payload);
  });
}

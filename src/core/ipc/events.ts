/**
 * Rust 側 event の型付き listen ラッパー。Tauri API を import するのはこのディレクトリのみ。
 */
import { listen } from "@tauri-apps/api/event";
import type { UnlistenFn } from "@tauri-apps/api/event";
import type { PaneLoadEventPayload } from "./types";

export function onPanePageLoad(
  callback: (payload: PaneLoadEventPayload) => void,
): Promise<UnlistenFn> {
  return listen<PaneLoadEventPayload>("pane://page-load", (event) => {
    callback(event.payload);
  });
}

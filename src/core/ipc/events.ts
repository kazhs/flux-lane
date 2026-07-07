/**
 * Rust 側 event の型付き listen ラッパー。Tauri API を import するのはこのディレクトリのみ。
 */
import { listen } from "@tauri-apps/api/event";
import type { UnlistenFn } from "@tauri-apps/api/event";
import type {
  AppGotoEventPayload,
  PaneAccountEventPayload,
  PaneLoadEventPayload,
  PaneMenuActionEventPayload,
  PanePointerDownEventPayload,
  PaneWheelEventPayload,
  WorkspaceMenuActionEventPayload,
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

export function onWorkspaceMenuAction(
  callback: (payload: WorkspaceMenuActionEventPayload) => void,
): Promise<UnlistenFn> {
  return listen<WorkspaceMenuActionEventPayload>(
    "workspace://menu-action",
    (event) => {
      callback(event.payload);
    },
  );
}

export function onPaneAccount(
  callback: (payload: PaneAccountEventPayload) => void,
): Promise<UnlistenFn> {
  return listen<PaneAccountEventPayload>("pane://account", (event) => {
    callback(event.payload);
  });
}

/** ネイティブメニューの「移動」サブメニュー（⌘1〜9 / ⌃1〜9）操作（app://goto）。 */
export function onAppGoto(
  callback: (payload: AppGotoEventPayload) => void,
): Promise<UnlistenFn> {
  return listen<AppGotoEventPayload>("app://goto", (event) => {
    callback(event.payload);
  });
}

/** CloseRequested を Rust 側が一旦止めたときの flush 依頼（app://close-requested）。 */
export function onAppCloseRequested(callback: () => void): Promise<UnlistenFn> {
  return listen("app://close-requested", () => {
    callback();
  });
}

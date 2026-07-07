/**
 * Rust 側 command の型付き invoke ラッパー。Tauri API を import するのはこのディレクトリのみ。
 */
import { invoke } from "@tauri-apps/api/core";
import type { SessionId } from "../../types";
import type { Bounds, PaneMenuWorkspaceEntry } from "./types";

export interface CreatePaneWebviewParams {
  label: string;
  url: string;
  sessionId: SessionId;
  bounds: Bounds;
  /** DOM の実測ビューポート高（window.innerHeight）。Rust 側で子 webview の
   * 座標原点補正（タイトルバー差分）に使う。 */
  viewportHeight: number;
}

export function createPaneWebview(
  params: CreatePaneWebviewParams,
): Promise<void> {
  return invoke("create_pane_webview", { ...params });
}

export function destroyPaneWebview(
  label: string,
  purgeData: boolean,
): Promise<void> {
  return invoke("destroy_pane_webview", { label, purgeData });
}

export function setPaneBounds(
  label: string,
  bounds: Bounds,
  viewportHeight: number,
): Promise<void> {
  return invoke("set_pane_bounds", { label, bounds, viewportHeight });
}

export function setPaneVisible(label: string, visible: boolean): Promise<void> {
  return invoke("set_pane_visible", { label, visible });
}

export function reloadPane(label: string): Promise<void> {
  return invoke("reload_pane", { label });
}

export function evalInPane(label: string, js: string): Promise<void> {
  return invoke("eval_in_pane", { label, js });
}

export function focusWebview(label: string): Promise<void> {
  return invoke("focus_webview", { label });
}

/** レールアイテムのネイティブコンテキストメニュー（カーソル位置）を表示する。
 * `workspaces` は「ワークスペースへ移動」サブメニューの選択肢（現在の全 workspace）。 */
export function popupPaneMenu(
  paneLabel: string,
  workspaces: PaneMenuWorkspaceEntry[],
): Promise<void> {
  return invoke("popup_pane_menu", { paneLabel, workspaces });
}

/** WorkspaceTab のネイティブコンテキストメニュー（カーソル位置）を表示する。 */
export function popupWorkspaceMenu(
  workspaceId: string,
  isLast: boolean,
): Promise<void> {
  return invoke("popup_workspace_menu", { workspaceId, isLast });
}

export function loadPersistedState(): Promise<string | null> {
  return invoke("load_persisted_state");
}

export function savePersistedState(json: string): Promise<void> {
  return invoke("save_persisted_state", { json });
}

/** 二段階シャットダウン: 永続化 flush 完了後にプロセスを終了させる。 */
export function completeShutdown(): Promise<void> {
  return invoke("complete_shutdown");
}

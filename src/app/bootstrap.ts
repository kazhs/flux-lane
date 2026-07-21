import { useAppStore } from "../stores/appStore";
import { useUiStore } from "../stores/uiStore";
import { webviewManager } from "../core/webview/WebviewManager";
import { layoutController } from "../core/webview/LayoutController";
import { createPersister, type Persister } from "../core/persistence/persister";
import { loadOrDefault } from "../core/persistence/loadOrDefault";
import { completeShutdown } from "../core/ipc/commands";
import {
  onAppCloseRequested,
  onAppGoto,
  onAppNavigate,
  onAppPaneAction,
} from "../core/ipc/events";
import {
  selectAdjacentPane,
  selectPaneByIndex,
} from "../features/panes/paneNavigation";
import { activateAdjacentWorkspace } from "../features/workspaces/workspaceNavigation";
import { closePaneWithConfirm } from "../features/panes/paneClose";

let persister: Persister | null = null;

/** flush が異常に長引いても終了はさせる（ハング回避を優先する上限）。 */
const SHUTDOWN_FLUSH_TIMEOUT_MS = 2000;

/**
 * 二段階シャットダウンのフロント側。Rust が CloseRequested を止めてこのイベントを
 * 投げてくるので、永続化 flush の完了（またはタイムアウト）を待ってから終了を依頼する。
 * beforeunload の fire-and-forget flush では IPC 完了前にプロセスが落ち得るため。
 */
async function shutdownGracefully(): Promise<void> {
  const timeout = new Promise<void>((resolve) => {
    setTimeout(resolve, SHUTDOWN_FLUSH_TIMEOUT_MS);
  });
  try {
    await Promise.race([persister?.flush() ?? Promise.resolve(), timeout]);
  } finally {
    void completeShutdown();
  }
}

/**
 * 起動シーケンス（docs/ARCHITECTURE.md ディレクトリ構成コメント）:
 * 永続化 load → store 復元 → WebviewManager 起動 → LayoutController 起動 → persister 起動。
 * main.tsx から一度だけ呼ぶ。
 */
export async function bootstrap(): Promise<void> {
  const persisted = await loadOrDefault();
  useAppStore.getState().hydrate(persisted);

  await webviewManager.init();

  layoutController.start((rects, hiddenChanges) => {
    void webviewManager.setBounds(rects);
    webviewManager.setLayoutHidden(hiddenChanges);
  });

  persister = createPersister(useAppStore);

  void onAppCloseRequested(() => {
    void shutdownGracefully();
  });

  // ネイティブメニューの「移動」サブメニュー（⌘1〜9 / ⌃1〜9）。React 外・モジュールレベルで
  // 一度だけ登録する（bootstrap は main.tsx から一度しか呼ばれない）。
  void onAppGoto((payload) => {
    if (payload.kind === "pane") {
      selectPaneByIndex(payload.index);
      return;
    }
    const workspaceId =
      useAppStore.getState().workspaceOrder[payload.index - 1];
    if (!workspaceId) return;
    useAppStore.getState().setActiveWorkspace(workspaceId);
  });

  // ネイティブメニューの「ペイン」サブメニュー。add はグローバル（フォーカス不問でモーダルを
  // 開く）、それ以外はフォーカス中ペインが対象。フォーカスが無い（null）場合は no-op。
  // closePaneWithConfirm は確認発火前に paneId/title を確定させるため、確認待ち中にフォーカスが
  // 変わっても対象はずれない。
  void onAppPaneAction((payload) => {
    if (payload.action === "add") {
      useUiStore.getState().setAddPaneOpen(true);
      return;
    }

    const paneId = useUiStore.getState().focusedPaneId;
    if (!paneId) return;

    if (payload.action === "reload") {
      void webviewManager.reload(paneId);
      return;
    }
    if (payload.action === "toggle-mute") {
      const pane = useAppStore.getState().panes[paneId];
      if (!pane) return;
      const muted = !pane.muted;
      useAppStore.getState().updatePane(paneId, { muted });
      void webviewManager.setMuted(paneId, muted);
      return;
    }
    if (payload.action === "toggle-autoscroll") {
      const pane = useAppStore.getState().panes[paneId];
      if (!pane) return;
      useAppStore
        .getState()
        .updatePane(paneId, { autoScroll: !pane.autoScroll });
      void webviewManager.setAutoScroll(paneId);
      return;
    }
    // action === "close"
    const pane = useAppStore.getState().panes[paneId];
    const title = pane?.title ?? paneId;
    void closePaneWithConfirm(paneId, title);
  });

  // ペイン / ワークスペースの相対移動（⌘⌥←→ / ⌃⇥・⌃⇧⇥）。
  void onAppNavigate((payload) => {
    if (payload.target === "pane") {
      selectAdjacentPane(payload.direction);
      return;
    }
    activateAdjacentWorkspace(payload.direction);
  });

  // 二段階シャットダウンが主経路。beforeunload は reload 等の取りこぼし向け best-effort。
  window.addEventListener("beforeunload", () => {
    void persister?.flush();
  });
}
